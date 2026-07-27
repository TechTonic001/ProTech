const SkeletonCard = ({ lines = 3 }) => (
  <div className="bg-white rounded-2xl p-5 animate-pulse">
    <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`h-3 bg-slate-100 rounded mb-2 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
      />
    ))}
  </div>
);

export default SkeletonCard;