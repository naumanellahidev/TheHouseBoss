import { AdminPageHeader } from "@/components/admin/page-header";
import { ReviewsManager } from "@/components/admin/reviews/reviews-manager";
import { getAdminReviews } from "@/lib/queries/admin";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  const reviews = await getAdminReviews();
  const live = reviews.filter((review) => review.published).length;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Reviews"
        description={
          reviews.length > 0
            ? `${reviews.length} on file, ${live} published.`
            : "Reviews you have actually received, with their source."
        }
      />
      <ReviewsManager reviews={reviews} />
    </div>
  );
}
