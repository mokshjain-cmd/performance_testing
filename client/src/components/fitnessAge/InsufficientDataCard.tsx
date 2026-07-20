interface InsufficientDataCardProps {
  message: string;
}

export default function InsufficientDataCard({ message }: InsufficientDataCardProps) {
  return (
    <div className="flex items-center gap-4 bg-white border border-dashed border-gray-200 rounded-2xl px-6 py-8">
      <div className="w-14 h-14 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-2xl text-gray-300 flex-shrink-0">
        ⏳
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-700 mb-1">Still calibrating</div>
        <p className="text-xs text-gray-500 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
