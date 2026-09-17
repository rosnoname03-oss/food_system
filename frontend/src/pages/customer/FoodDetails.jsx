import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FiArrowLeft, FiPlus, FiMinus, FiShoppingBag } from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { PageLoading } from '../../components/Loading'
import { DEFAULT_PLACEHOLDER_IMAGE } from '../../utils/constants'

const FoodDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { t, translateCategory, translateType } = useLanguage()

  // SWR: Initialize item from cached menu if available for instant display
  const [item, setItem] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_menu_items')
      if (cached) {
        const items = JSON.parse(cached)
        return items.find((it) => String(it.id) === String(id)) || null
      }
    } catch {
      return null
    }
    return null
  })

  const [selectedVariant, setSelectedVariant] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_menu_items')
      if (cached) {
        const items = JSON.parse(cached)
        const found = items.find((it) => String(it.id) === String(id))
        if (found?.prices?.length > 0) {
          return found.prices.find((p) => p.is_default) || found.prices[0]
        }
      }
    } catch {
      return null
    }
    return null
  })

  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_menu_items')
      if (cached) {
        const items = JSON.parse(cached)
        return !items.some((it) => String(it.id) === String(id))
      }
    } catch {
      return true
    }
    return true
  })

  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')

  useEffect(() => {
    fetchItemDetails()
  }, [id])

  const fetchItemDetails = async () => {
    try {
      if (!item) setLoading(true)
      const res = await api.get(`/menu-items/${id}`)
      const fetchedItem = res.data.data
      setItem(fetchedItem)

      // Set default variant if variants exist
      if (fetchedItem.prices && fetchedItem.prices.length > 0) {
        const defaultVar = fetchedItem.prices.find((p) => p.is_default) || fetchedItem.prices[0]
        setSelectedVariant(defaultVar)
      }
    } catch (err) {
      if (!item) {
        toast.error(t('failedToLoadMenu'))
        navigate('/menu')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <PageLoading text={t('loadingDishes')} />
  }

  if (!item) return null

  const hasMultiplePrices = item.has_multiple_prices || (item.prices && item.prices.length > 0)
  const activePrice = selectedVariant ? parseFloat(selectedVariant.price) : parseFloat(item.price)
  const totalPrice = (activePrice * quantity).toFixed(2)
  const totalPriceKHR = (Math.round(activePrice * quantity * 4000)).toLocaleString()

  const handleAddToCart = () => {
    if (!item.is_available) return

    addToCart({
      ...item,
      price: activePrice,
      variant_id: selectedVariant?.id || null,
      variant_name: selectedVariant?.name || null,
      note,
      quantity,
    })

    toast.success(
      t('addedItemToCart', {
        item: selectedVariant ? `${item.name} (${selectedVariant.name})` : item.name,
      })
    )
    navigate('/menu')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
      {/* Back button & quick navigation */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 bg-white px-3 py-1.5 rounded-full border border-slate-200/80 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>{t('backToMenu')}</span>
        </button>

        <Link
          to="/cart"
          className="text-xs font-semibold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200 hover:bg-orange-100 hover:scale-105 transition-all"
        >
          {t('viewCart')}
        </Link>
      </div>

      {/* Responsive Main Container: Single column on mobile, 2-column on tablet & desktop */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left: Hero Dish Image */}
        <div className="md:col-span-6 lg:col-span-6 group relative aspect-4/3 sm:aspect-16/10 md:aspect-square rounded-3xl overflow-hidden shadow-lg bg-slate-100 border border-slate-200/60 md:sticky md:top-20">
          <img
            src={item.image || DEFAULT_PLACEHOLDER_IMAGE}
            alt={item.name}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              e.target.src = DEFAULT_PLACEHOLDER_IMAGE;
            }}
          />

          {item.is_featured && (
            <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold shadow-md inline-flex items-center gap-1.5">
              <i className="fi fi-sr-star text-amber-200 text-xs" />
              <span>{t('chefSpecial')}</span>
            </div>
          )}

          {!item.is_available && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center">
              <span className="px-4 py-1.5 rounded-full bg-red-600 text-white text-sm font-bold uppercase tracking-wider shadow-lg">
                {t('soldOut')}
              </span>
            </div>
          )}
        </div>

        {/* Right: Dish Information & Actions */}
        <div className="md:col-span-6 lg:col-span-6 space-y-5">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-md inline-block mb-1">
                  {translateType(item.type)} • {translateCategory(item.category_name)}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{item.name}</h1>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl sm:text-3xl font-black text-orange-600 block">
                  ${unitPrice.toFixed(2)}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-400 block">
                  {unitPriceKhr.toLocaleString()} ៛
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              {item.description || t('defaultDishDesc')}
            </p>

            {/* Multiple Sizes / Price Options Selector */}
            {item.prices && item.prices.length > 1 && (
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 mb-2 flex items-center justify-between">
                  <span>{t('chooseYourPrice')} *</span>
                  <span className="text-[10px] text-orange-600 font-bold lowercase">({item.prices.length} {t('priceOptions')})</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {item.prices.map((p) => {
                    const isSelected = selectedVariant?.id === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedVariant(p)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50/90 ring-2 ring-orange-500/25 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-black truncate pr-1 ${isSelected ? 'text-orange-950' : 'text-slate-900'}`}>
                            {p.name}
                          </span>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-orange-600 bg-orange-600' : 'border-slate-300'
                          }`}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                          </span>
                        </div>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className={`text-base font-black ${isSelected ? 'text-orange-600' : 'text-slate-900'}`}>
                            ${parseFloat(p.price).toFixed(2)}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            ({(Math.round(parseFloat(p.price) * 4000)).toLocaleString()} ៛)
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Special Instructions */}
            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                {t('specialInstructions')}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('specialInstructionsHelp')}
                maxLength={200}
                rows={3}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-full border border-slate-200 shrink-0">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-9 h-9 rounded-full bg-white text-slate-700 font-bold flex items-center justify-center hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40 shadow-xs cursor-pointer active:scale-90 transition-transform"
              >
                <FiMinus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-bold text-slate-900 text-sm">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-9 rounded-full bg-white text-slate-700 font-bold flex items-center justify-center hover:bg-orange-50 hover:text-orange-600 shadow-xs cursor-pointer active:scale-90 transition-transform"
              >
                <FiPlus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={!item.is_available}
              className="flex-1 py-3.5 px-6 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-between cursor-pointer animate-pulse-glow"
            >
              <span className="flex items-center gap-2">
                <FiShoppingBag className="w-4 h-4" />
                <span>{t('addToOrder')}</span>
              </span>
              <span>${totalPrice}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FoodDetails
