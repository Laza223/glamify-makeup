"use client";

import { useState } from "react";
import { PenLine, Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RatingInput } from "@/components/ui/rating-stars";
import { track } from "@/lib/analytics/track";
import { createReviewAction } from "./review-actions";
import {
  REVIEW_PHOTO_FORMATS_LABEL,
  REVIEW_PHOTO_MAX_BYTES,
  REVIEW_PHOTO_MAX_MB,
  REVIEW_PHOTO_MIME,
  isReviewPhotoType,
} from "./review-photo";

export function ReviewForm({
  productId,
  slug,
  isLoggedIn,
}: {
  productId: string;
  slug: string;
  isLoggedIn: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneStatus, setDoneStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const invalid = !isReviewPhotoType(file.type)
        ? `Formato de foto no permitido. Subí ${REVIEW_PHOTO_FORMATS_LABEL}.`
        : file.size > REVIEW_PHOTO_MAX_BYTES
          ? `La foto supera el límite de ${REVIEW_PHOTO_MAX_MB} MB.`
          : null;
      if (invalid) {
        setError(invalid);
        e.target.value = "";
        setPreviewUrl(null);
        return;
      }
      setError(null);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  function removePhoto() {
    setPreviewUrl(null);
    const input = document.getElementById("rphoto") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await createReviewAction(fd);
    setPending(false);
    if (res.ok) {
      setDoneStatus(res.status ?? "pending");
      track("review_submitted", { status: res.status });
    } else {
      setError(res.error ?? "Ocurrió un error al enviar la reseña.");
    }
  }

  if (doneStatus) {
    return (
      <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
        {doneStatus === "approved"
          ? "¡Muchas gracias por tu reseña! Ya está publicada en la tienda."
          : "¡Muchas gracias por tu reseña! La revisamos antes de publicarla."}
      </p>
    );
  }

  if (!isOpen) {
    return (
      <div className="pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="gap-1.5 rounded-full text-xs font-semibold hover:bg-secondary hover:text-primary"
        >
          <PenLine className="size-3.5" />
          <span>Escribir reseña</span>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="animate-fade-up space-y-4 motion-reduce:animate-none rounded-2xl border border-border bg-white p-5 shadow-soft"
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />

      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">
          Tu opinión sobre este producto
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="min-h-11 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>

      <RatingInput name="rating" />

      {!isLoggedIn && (
        <div className="space-y-1.5">
          <Label htmlFor="rname">Tu nombre</Label>
          <Input
            id="rname"
            name="authorName"
            required
            minLength={2}
            maxLength={60}
            autoComplete="name"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="rtitle">Título (opcional)</Label>
        <Input
          id="rtitle"
          name="title"
          maxLength={120}
          placeholder="¿Qué fue lo que más te gustó?"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rbody">Tu experiencia</Label>
        <Textarea
          id="rbody"
          name="body"
          required
          maxLength={2000}
          rows={3}
          placeholder="Contanos qué te pareció la textura, pigmentación o duración..."
        />
      </div>

      {/* Subida de foto */}
      <div className="space-y-2 pt-1">
        <Label className="flex items-center justify-between text-xs font-semibold text-foreground">
          <span>Foto del producto (opcional)</span>
          <span className="text-[11px] font-normal text-muted-foreground">
            Hasta {REVIEW_PHOTO_MAX_MB} MB ({REVIEW_PHOTO_FORMATS_LABEL})
          </span>
        </Label>

        {previewUrl ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Vista previa de la foto"
              className="shadow-2xs size-20 rounded-xl border border-border/80 object-cover"
            />
            <button
              type="button"
              onClick={removePhoto}
              className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-destructive text-white shadow-sm transition-transform hover:bg-destructive/90 active:scale-95"
              aria-label="Eliminar foto"
            >
              <X className="size-3.5 stroke-[3]" />
            </button>
          </div>
        ) : (
          <div>
            <label
              htmlFor="rphoto"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border/90 bg-surface-alt/60 px-4 py-2.5 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary/50 hover:bg-surface-alt"
            >
              <Camera className="size-4 text-primary" />
              <span>Subir foto con el resultado</span>
            </label>
            <input
              id="rphoto"
              name="photo"
              type="file"
              accept={REVIEW_PHOTO_MIME.join(",")}
              onChange={onFileChange}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Honeypot anti-spam */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      {!isLoggedIn && (
        <p className="text-xs text-muted-foreground">
          Revisamos las reseñas antes de publicarlas.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-primary px-6 font-semibold text-white shadow-soft hover:bg-primary-hover sm:w-auto"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            <span>Enviando reseña…</span>
          </>
        ) : (
          "Enviar reseña"
        )}
      </Button>
    </form>
  );
}
