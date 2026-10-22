import Image from "next/image";
import { RatingStars } from "@/components/ui/rating-stars";
import { productImageUrl } from "@/lib/images";
import { publicAuthorName } from "@/lib/reviews/author";

export interface ReviewView {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  photoUrl?: string | null;
  verifiedPurchase: boolean;
  createdAt: Date;
}

export function ReviewCard({ review }: { review: ReviewView }) {
  const photo = productImageUrl(review.photoUrl);

  return (
    <article className="space-y-2.5 rounded-2xl border border-border/80 bg-white p-4 shadow-soft transition-all hover:border-border">
      <div className="flex items-center justify-between">
        <RatingStars value={review.rating} size="sm" />
        {review.verifiedPurchase && (
          <span className="text-xs font-semibold text-primary">
            Compra verificada
          </span>
        )}
      </div>

      {review.title && (
        <h3 className="text-sm font-bold text-foreground">{review.title}</h3>
      )}

      <p className="text-sm leading-relaxed text-foreground/80">
        {review.body}
      </p>

      {photo && (
        <div className="pt-1">
          <a
            href={photo}
            target="_blank"
            rel="noreferrer"
            className="shadow-2xs group relative block size-20 overflow-hidden rounded-xl border border-border/70 bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Ver foto en tamaño completo"
          >
            <Image
              src={photo}
              alt={`Foto de ${publicAuthorName(review.authorName)}`}
              fill
              sizes="80px"
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
          </a>
        </div>
      )}

      <p className="pt-0.5 text-xs text-muted-foreground">
        {publicAuthorName(review.authorName)} · {review.createdAt.toLocaleDateString("es-AR")}
      </p>
    </article>
  );
}
