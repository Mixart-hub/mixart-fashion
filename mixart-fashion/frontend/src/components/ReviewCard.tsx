import StarRating from './ui/StarRating'

interface Review {
  id: string; rating: number; comment?: string; createdAt: string
  user: { id: string; name: string; avatarUrl?: string }
}

export default function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="border border-cream rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-rose text-white flex items-center justify-center text-sm font-semibold">
          {review.user.name[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-sm text-dark">{review.user.name}</p>
          <p className="text-xs text-dark-muted">{new Date(review.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="ml-auto">
          <StarRating value={review.rating} size="sm" />
        </div>
      </div>
      {review.comment && <p className="text-sm text-dark-muted leading-relaxed">{review.comment}</p>}
    </div>
  )
}
