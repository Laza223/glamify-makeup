"use server";

import { revalidatePath } from "next/cache";
import { getCustomer } from "@/lib/customer/auth";
import { createReview } from "@/lib/reviews/service";
import { publicAuthorName } from "@/lib/reviews/author";
import { validateReview } from "@/lib/reviews/validation";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/admin/products/images";
import type { ActionResult } from "@/lib/forms/action-result";
import { customerErrorMessage } from "@/lib/orders/customer-error";
import {
  REVIEW_PHOTO_FORMATS_LABEL,
  REVIEW_PHOTO_MAX_BYTES,
  REVIEW_PHOTO_MAX_MB,
  isReviewPhotoType,
} from "./review-photo";

export interface ReviewActionResult extends ActionResult {
  status?: string;
}

export async function createReviewAction(
  inputOrFormData:
    | FormData
    | {
        productId: string;
        slug: string;
        rating: number;
        title: string;
        body: string;
        authorName?: string;
        website?: string;
        photoUrl?: string | null;
      },
): Promise<ReviewActionResult> {
  let productId = "";
  let slug = "";
  let rating = 0;
  let title = "";
  let body = "";
  let authorName: string | undefined;
  let website: string | undefined;
  let photoUrl: string | null = null;

  if (inputOrFormData instanceof FormData) {
    website = String(inputOrFormData.get("website") ?? "");
    productId = String(inputOrFormData.get("productId") ?? "");
    slug = String(inputOrFormData.get("slug") ?? "");
    rating = Number(inputOrFormData.get("rating") ?? 0);
    title = String(inputOrFormData.get("title") ?? "");
    body = String(inputOrFormData.get("body") ?? "");
    authorName =
      String(inputOrFormData.get("authorName") ?? "").trim() || undefined;

    const photoFile = inputOrFormData.get("photo") as File | null;
    if (photoFile && photoFile.size > 0 && photoFile.name) {
      if (!isReviewPhotoType(photoFile.type)) {
        return {
          ok: false,
          error: `Formato de foto no permitido. Subí ${REVIEW_PHOTO_FORMATS_LABEL}.`,
        };
      }
      if (photoFile.size > REVIEW_PHOTO_MAX_BYTES) {
        return { ok: false, error: `La foto no puede superar los ${REVIEW_PHOTO_MAX_MB} MB.` };
      }

      const ext =
        photoFile.type.split("/")[1] === "jpeg"
          ? "jpg"
          : photoFile.type.split("/")[1] || "jpg";
      const path = `reviews/${crypto.randomUUID()}.${ext}`;

      const supabase = createAdminClient();
      const { error } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(path, photoFile, {
          contentType: photoFile.type,
          upsert: false,
        });

      if (error) {
        console.error("[createReviewAction] subida de foto", error);
        return { ok: false, error: "No pudimos subir la foto. Probá con otra o enviá la reseña sin foto." };
      }
      photoUrl = path;
    }
  } else {
    productId = inputOrFormData.productId;
    slug = inputOrFormData.slug;
    rating = Number(inputOrFormData.rating);
    title = inputOrFormData.title;
    body = inputOrFormData.body;
    authorName = inputOrFormData.authorName;
    website = inputOrFormData.website;
    photoUrl = inputOrFormData.photoUrl ?? null;
  }

  // Bot: campo trampa completado → fingimos éxito sin crear nada.
  if (website && website.trim() !== "") return { ok: true, status: "pending" };

  const customer = await getCustomer();
  // Los mensajes de validación están escritos para la clienta; lo que tire createReview (DB) no.
  const authorForValidation = customer ? undefined : (authorName ?? "").trim();
  const valid = validateReview({ rating, title, body, authorName: authorForValidation });
  if (!valid.ok) return { ok: false, error: valid.reason };

  try {
    const res = await createReview(
      {
        customerId: customer?.id ?? null,
        authorName: customer
          ? publicAuthorName(customer.name)
          : (authorName ?? "").trim(),
        productId,
        rating,
        title,
        body,
        photoUrl,
      },
      { db: prisma as never },
    );
    revalidatePath(`/producto/${slug}`);
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, error: customerErrorMessage(e, "createReviewAction", "No pudimos enviar tu reseña. Probá de nuevo en un rato.") };
  }
}
