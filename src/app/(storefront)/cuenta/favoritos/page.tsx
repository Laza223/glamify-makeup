import { Heart } from "lucide-react";
import { requireCustomer } from "@/lib/customer/auth";
import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/catalog/product-grid";
import { PRODUCT_INCLUDE } from "@/lib/catalog/queries";
import { toCatalogProduct } from "@/lib/catalog/dto";
import { AccountEmpty } from "../account-empty";

export default async function FavoritosPage() {
  const customer = await requireCustomer();
  const rows = await prisma.wishlist.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    include: { product: { include: PRODUCT_INCLUDE } },
  });
  const products = rows
    .map((r) => r.product)
    .filter((p) => p.active && !p.deletedAt)
    .map(toCatalogProduct);

  if (products.length === 0) {
    return <AccountEmpty icon={Heart} lead="Tu lista está" accent="vacía" text="Tocá el corazón de los productos que te gusten y los encontrás acá cuando quieras." />;
  }

  return <ProductGrid products={products} />;
}
