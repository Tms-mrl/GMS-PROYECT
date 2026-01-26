import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HelpCircle, X, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const supportFormSchema = z.object({
  message: z.string().min(10, "El mensaje debe tener al menos 10 caracteres"),
});

type SupportFormValues = z.infer<typeof supportFormSchema>;

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
  const { toast } = useToast();
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const form = useForm<SupportFormValues>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      message: "",
    },
  });

  const sendSupportRequest = useMutation({
    mutationFn: async (data: SupportFormValues) => {
      // 1. Upload Images First (if any)
      const uploadedUrls: string[] = [];

      if (images.length > 0) {
        // Enviar toast de progreso
        toast({ title: "Subiendo imágenes...", description: "Por favor espere." });

        for (const image of images) {
          const formData = new FormData();
          formData.append("file", image);

          const { data: { session } } = await supabase.auth.getSession();
          const headers: Record<string, string> = {};
          if (session?.access_token) {
            headers["Authorization"] = `Bearer ${session.access_token}`;
          }

          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers,
            body: formData,
          });

          if (!uploadRes.ok) {
            throw new Error(`Error al subir imagen: ${image.name}`);
          }

          const uploadData = await uploadRes.json();
          uploadedUrls.push(uploadData.url);
        }
      }

      // 2. Send Support Ticket with URLs
      const payload = {
        message: data.message,
        imageUrls: uploadedUrls, // Enviar URLs
      };

      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/support", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorMessage = "Error al enviar el mensaje";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          const text = await res.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Mensaje enviado",
        description: "Tu solicitud de soporte ha sido enviada correctamente al equipo."
      });
      form.reset();
      setImages([]);
      setImagePreviews([]);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al enviar",
        description: error.message || "No se pudo enviar el mensaje",
        variant: "destructive"
      });
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validar que sean imágenes
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast({
        title: "Archivo inválido",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive"
      });
      return;
    }

    // Limitar a 5 imágenes máximo
    const newImages = [...images, ...imageFiles].slice(0, 5);
    setImages(newImages);

    // Crear previews
    const newPreviews = newImages.map(file => URL.createObjectURL(file));
    // Limpiar previews anteriores
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImagePreviews(newPreviews);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);

    // Revocar URL del preview eliminado
    URL.revokeObjectURL(imagePreviews[index]);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
  };

  const onSubmit = form.handleSubmit((data) => {
    sendSupportRequest.mutate(data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Contactar Soporte
          </DialogTitle>
          <DialogDescription>
            Describe tu problema o consulta. Puedes adjuntar imágenes para ayudarnos a entender mejor la situación.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensaje *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe tu problema o consulta..."
                      className="min-h-[120px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Imágenes (opcional, máximo 5)</Label>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                    disabled={images.length >= 5}
                  />
                  <Label
                    htmlFor="image-upload"
                    className="flex items-center justify-center gap-2 h-10 px-4 border border-dashed rounded-md cursor-pointer hover:bg-accent transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">
                      {images.length >= 5
                        ? "Máximo de imágenes alcanzado"
                        : "Seleccionar imágenes"}
                    </span>
                  </Label>
                </div>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1 rounded">
                          {images[index].name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={sendSupportRequest.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={sendSupportRequest.isPending}
              >
                {sendSupportRequest.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Mensaje"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

