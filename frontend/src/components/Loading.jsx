export const Spinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div
      className={`inline-block animate-spin rounded-full border-solid border-orange-500 border-t-transparent ${
        sizeClasses[size] || sizeClasses.md
      } ${className}`}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export const PageLoading = ({ text = 'Loading delicious menu...' }) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center animate-pulse">
          <i className="fi fi-sr-restaurant text-2xl text-orange-600" />
        </div>
        <div className="absolute -bottom-1 -right-1">
          <Spinner size="sm" />
        </div>
      </div>
      <p className="text-slate-600 font-medium text-sm animate-pulse">{text}</p>
    </div>
  )
}

export const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-3xl p-3 sm:p-4 shadow-xs border border-slate-100 animate-pulse flex flex-row items-stretch gap-3 sm:gap-4 min-h-[135px]">
      <div className="w-28 sm:w-36 md:w-40 aspect-square sm:aspect-auto bg-slate-200 rounded-2xl shrink-0"></div>
      <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
        <div>
          <div className="h-4 sm:h-5 bg-slate-200 rounded-md w-3/4 mb-2"></div>
          <div className="h-3 bg-slate-200 rounded-md w-full mb-1.5"></div>
          <div className="h-3 bg-slate-200 rounded-md w-1/2"></div>
        </div>
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100">
          <div className="h-5 bg-slate-200 rounded-md w-1/4"></div>
          <div className="flex items-center gap-2">
            <div className="h-7 bg-slate-200 rounded-full w-12"></div>
            <div className="h-7 bg-slate-200 rounded-full w-16"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
