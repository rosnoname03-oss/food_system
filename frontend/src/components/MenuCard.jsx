import { FiPlus, FiCheck, FiInfo } from 'react-icons/fi'
import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { DEFAULT_PLACEHOLDER_IMAGE } from '../utils/constants'

const MenuCard = ({ item, onSelect, onQuickAdd, priority = false }) => {
  const [justAdded, setJustAdded] = useState(false)
  const { t, translateType } = useLanguage()

  const hasMultiplePrices = item.has_multiple_prices || (item.prices && item.prices.length > 1)

  // Track customer's selected option on the card (defaults to item's default or first variant)
  const [selectedVariant, setSelectedVariant] = useState(() => {
    if (item.prices && item.prices.length > 0) {
      return item.prices.find((p) => p.is_default) || item.prices[0]
    }
    return null
  })

  const handleAdd = (e) => {
    e.stopPropagation()
    if (!item.is_available) return

    if (hasMultiplePrices) {
      const variantToOrder = selectedVariant || item.prices?.[0]
      onQuickAdd(item, variantToOrder)
      setJustAdded(true)
      setTimeout(() => setJustAdded(false), 1200)
      return
    }

    onQuickAdd(item)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1200)
  }

  const handleOpenInfo = (e) => {
    e.stopPropagation()
    onSelect(item, selectedVariant)
  }

  return (
    <div
      onClick={() => onSelect(item, selectedVariant)}
      className={`group relative bg-white rounded-3xl border border-slate-100/90 shadow-xs hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 overflow-hidden flex flex-row items-stretch cursor-pointer card-shimmer ${
        !item.is_available ? 'opacity-70' : 'hover:-translate-y-1'
      }`}
    >
      {/* Left side: Food Poster/Image */}
      <div className="relative w-32 min-[400px]:w-36 sm:w-44 md:w-48 shrink-0 overflow-hidden bg-slate-100 self-stretch">
        <img
          src={item.image || DEFAULT_PLACEHOLDER_IMAGE}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onError={(e) => {
            e.target.src = DEFAULT_PLACEHOLDER_IMAGE;
          }}
        />

        {/* Featured Tag */}
        {item.is_featured && item.is_available && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-xs inline-flex items-center gap-1 z-10">
            <i className="fi fi-sr-star text-[9px] text-amber-200" />
            <span>{t('popularTag')}</span>
          </div>
        )}

        {/* Unavailable Overlay */}
        {!item.is_available && (
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-2xs flex items-center justify-center p-2 z-10">
            <span className="px-2.5 py-1 rounded-full bg-red-600/95 text-white text-[11px] font-bold shadow-md tracking-wide uppercase">
              {t('soldOut')}
            </span>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 z-10">
          <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium capitalize">
            {translateType(item.type)}
          </span>
          {hasMultiplePrices && (
            <span className="hidden min-[400px]:inline-block px-1.5 py-0.5 rounded-md bg-orange-600/80 backdrop-blur-xs text-white text-[9px] font-bold">
              {item.prices?.length} {t('sizesCount', { count: item.prices?.length || 2 })}
            </span>
          )}
        </div>
      </div>

      {/* Right side: Card Content & Details */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
              {item.name}
            </h3>
            {/* Quick Info button next to title */}
            <button
              type="button"
              onClick={handleOpenInfo}
              className="shrink-0 p-1 rounded-full text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
              title="View dish information"
              aria-label="View dish information"
            >
              <FiInfo className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {item.description || t('defaultDishDesc')}
          </p>
        </div>

        {/* Interactive Option Selector Pills (Normal, Special, etc.) */}
        {hasMultiplePrices && item.prices && item.prices.length > 0 && (
          <div className="mt-2 pt-1.5 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {t('chooseOption') || 'Select Option'}:
            </span>
            <div className="flex flex-wrap gap-1">
              {item.prices.map((p) => {
                const isSelected = (selectedVariant?.id || item.prices[0]?.id) === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedVariant(p)
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                      isSelected
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 border border-slate-200/80'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-orange-100' : 'text-slate-500'}`}>
                      ${parseFloat(p.price).toFixed(2)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Price & Action Buttons */}
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 gap-2">
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-sm sm:text-base text-orange-600 leading-tight">
              {hasMultiplePrices && selectedVariant
                ? `$${parseFloat(selectedVariant.price).toFixed(2)}`
                : item.formatted_price || `$${parseFloat(item.price).toFixed(2)}`}
            </span>
            <span className="text-[10px] font-bold text-slate-400 truncate">
              {hasMultiplePrices && selectedVariant
                ? `${(Math.round(parseFloat(selectedVariant.price) * 4000)).toLocaleString()} ៛`
                : item.formatted_price_khr || `${(parseFloat(item.price) * 4000).toLocaleString()} ៛`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Dedicated Info Button */}
            <button
              type="button"
              onClick={handleOpenInfo}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 border border-slate-200/80 transition-all cursor-pointer active:scale-95"
              aria-label="Dish Details"
              title="View full dish info"
            >
              <FiInfo className="w-3.5 h-3.5" />
              <span className="hidden min-[360px]:inline">Info</span>
            </button>

            {/* Add to Cart Button */}
            {item.is_available ? (
              <button
                type="button"
                onClick={handleAdd}
                disabled={justAdded}
                className={`inline-flex items-center justify-center gap-1 h-8 px-3 rounded-full text-xs font-bold transition-all duration-200 active:scale-90 hover:scale-105 cursor-pointer ${
                  justAdded
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-orange-600 text-white hover:bg-orange-500 shadow-xs hover:shadow-md hover:shadow-orange-500/25'
                }`}
                aria-label={`Add ${item.name} to cart`}
              >
                {justAdded ? (
                  <>
                    <FiCheck className="w-3.5 h-3.5" />
                    <span>{t('added')}</span>
                  </>
                ) : (
                  <>
                    <FiPlus className="w-3.5 h-3.5" />
                    <span>{t('add')}</span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-xs font-medium text-slate-400">{t('unavailable')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MenuCard
