import React, { useState, useEffect } from "react";
import { GrRadialSelected } from "react-icons/gr";
import { useDispatch, useSelector } from "react-redux";
import { addItems, removeAllItems, incrementQuantity, decrementQuantity } from "../../redux/slices/cartSlice";
import { setCustomer } from "../../redux/slices/customerSlice";
import { enqueueSnackbar } from "notistack";
import { useGetMenuItemsQuery, useGetMenuCategoriesQuery } from "../../redux/api/menuApi";
import { useLocation } from "react-router-dom";
import { useGetOrderQuery } from "../../redux/api/orderApi";

const MenuContainer = () => {
  const [selectedCategory, setSelectedCategory] = useState('All Items');
  const [searchTerm, setSearchTerm] = useState('');
  const dispatch = useDispatch();
  const location = useLocation();

  // Extract orderId from URL query parameters
  const queryParams = new URLSearchParams(location.search);
  const orderId = queryParams.get("orderId");

  const customerData = useSelector((state) => state.customer);
  const cartItems = useSelector((state) => state.cart);

  // RTK Query hooks
  const { data: categoriesResponse, isLoading: categoriesLoading } = useGetMenuCategoriesQuery();
  const { data: menuData = { data: [] }, isLoading: menuLoading } = useGetMenuItemsQuery({ available: true });
  const { data: orderResponse, isLoading: orderLoading } = useGetOrderQuery(orderId, { skip: !orderId });

  // Extract categories array from response
  const categoriesData = ['All Items', ...(categoriesResponse?.data || [])];

  // Category icons mapping
  const categoryIcons = {
    'All Items': '✨',
    'Biriyani': '🍛',
    'Rice Items': '🍚',
    'Fish Items': '🐟',
    'Chicken Items': '🍗',
    'Beef Items': '🥩',
    'Mutton Items': '🍖',
    'Drinks': '🍹',
    'Fast Foods': '🍟',
    'Kacchi Package': '🎁',
    'Others': '🍽️'
  };

  // Category colors mapping
  const categoryColors = {
    'All Items': '#000000',
    'Biriyani': '#b73e3e',
    'Rice Items': '#5b45b0',
    'Fish Items': '#1d2569',
    'Chicken Items': '#285430',
    'Beef Items': '#735f32',
    'Mutton Items': '#b73e3e',
    'Drinks': '#7f167f',
    'Fast Foods': '#1d2569',
    'Kacchi Package': '#e67e22',
    'Others': '#34495e'
  };

  // Set first category as selected when categories load
  React.useEffect(() => {
    if (categoriesData.length > 0 && !selectedCategory) {
      setSelectedCategory('All Items');
    }
  }, [categoriesData, selectedCategory]);

  // Extract search term from URL when component mounts or URL changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchTerm(decodeURIComponent(searchParam));
    } else if (location.search === '') {
      setSearchTerm('');
    }
  }, [location.search]);

  // Filter items by selected category and search term
  const filteredItems = menuData.data?.filter(item => {
    const matchesCategory = selectedCategory === 'All Items' || item.category === selectedCategory;
    const matchesSearch = !searchTerm ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

  const isLoading = categoriesLoading || menuLoading || orderLoading;

  // Pre-populate cart if orderId is present and order data is loaded
  useEffect(() => {
    if (orderId && orderResponse?.data) {
      dispatch(removeAllItems());
      orderResponse.data.items.forEach(item => {
        dispatch(addItems({ ...item, id: item._id }));
      });
      dispatch(setCustomer({
        serialNumber: orderResponse.data.customerDetails.serialNumber,
        guests: orderResponse.data.customerDetails.guests,
        table: orderResponse.data.table,
        orderType: orderResponse.data.orderType,
        orderId: orderResponse.data._id,
      }));
    } else if (!orderId) {
      dispatch(removeAllItems());
    }
  }, [orderId, orderResponse, dispatch]);

  const increment = (id) => {
    dispatch(incrementQuantity(id));
  };

  const decrement = (id) => {
    dispatch(decrementQuantity(id));
  };

  const handleAddToCart = (item) => {
    // Check if serial number is provided
    if (!customerData.serialNumber) {
      enqueueSnackbar("Please provide customer serial number first!", { variant: "error" });
      return;
    }

    // Check if order type is selected
    if (!customerData.orderType) {
      enqueueSnackbar("Please select an order type (Dine In or Take Away)!", { variant: "error" });
      return;
    }

    // For Dine In orders, check if guest number is provided
    if (customerData.orderType === 'Dine In' && !customerData.guests) {
      enqueueSnackbar("Please specify the number of guests for Dine In order!", { variant: "error" });
      return;
    }

    // For Dine In orders, check if table is selected
    if (customerData.orderType === 'Dine In' && !customerData.table) {
      enqueueSnackbar("Please select a table for Dine In order!", { variant: "error" });
      return;
    }

    // For Dine In orders, check if enough seats are selected for the number of guests
    if (customerData.orderType === 'Dine In' && customerData.seats) {
      const selectedSeatsCount = customerData.seats.length;
      if (selectedSeatsCount < customerData.guests) {
        enqueueSnackbar(`Not enough seats selected. You have ${customerData.guests} guests but only ${selectedSeatsCount} seats selected. Please select more seats.`, { variant: "error" });
        return;
      }
    }

    const existingCartItem = cartItems.find(cartItem => cartItem.id === item._id);

    if (existingCartItem) {
      dispatch(incrementQuantity(item._id));
    } else {
      const newObj = {
        id: item._id,
        name: item.title,
        pricePerQuantity: Number(item.price),
        quantity: 1,
        price: Number(item.price)
      };
      dispatch(addItems(newObj));
    }
  }


  if (isLoading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-orange-50 min-h-screen">
      {/* Categories Section */}
      <div className="px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="mb-6 lg:mb-10 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2 lg:mb-3">Menu Categories</h2>
          <p className="text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">Browse our carefully curated selection of delicious dishes</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
          {categoriesData.map((category) => {
            const itemCount = category === 'All Items'
              ? menuData.data?.length || 0
              : menuData.data?.filter(item => item.category === category).length || 0;
            const isSelected = selectedCategory === category;
            return (
              <div
                key={category}
                className={`group cursor-pointer transition-all duration-200 ${isSelected ? 'transform scale-105' : 'hover:transform hover:scale-105'
                  }`}
                onClick={() => {
                  setSelectedCategory(category);
                }}
              >
                <div
                  className={`relative bg-white border-2 rounded-xl lg:rounded-2xl p-3 lg:p-4 h-32 sm:h-36 lg:h-40 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-xl ${isSelected
                    ? 'border-orange-400 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 transform scale-105'
                    : 'border-gray-200 hover:border-orange-200 hover:bg-gradient-to-br hover:from-white hover:to-orange-25'
                    }`}
                >
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full p-1.5 lg:p-2 shadow-xl border-2 border-white">
                      <GrRadialSelected size={12} className="lg:w-4 lg:h-4" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex flex-col items-center text-center">
                    <div className={`text-3xl sm:text-4xl lg:text-5xl mb-2 lg:mb-3 transition-all duration-300 filter drop-shadow-sm ${isSelected ? 'transform scale-110' : 'group-hover:transform group-hover:scale-110'
                      }`}>
                      {categoryIcons[category] || '🍽️'}
                    </div>
                    <h3 className={`text-sm sm:text-base lg:text-lg font-bold leading-tight transition-colors ${isSelected ? 'text-orange-800' : 'text-gray-800 group-hover:text-orange-700'
                      }`}>
                      {category}
                    </h3>
                  </div>

                  <div className="text-center mt-2 lg:mt-3">
                    <span className={`text-xs lg:text-sm font-semibold px-2 lg:px-3 py-1 lg:py-1.5 rounded-full border transition-all duration-300 ${isSelected
                      ? 'bg-orange-200 text-orange-800 border-orange-300'
                      : 'bg-gray-100 text-gray-700 border-gray-200 group-hover:bg-orange-100 group-hover:text-orange-700 group-hover:border-orange-200'
                      }`}>
                      {itemCount} items
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Menu Items Section */}
      <div className="px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        {/* Section Header */}
        {selectedCategory && (
          <div className="text-center mb-12 lg:mb-16">
            <div className="flex items-center justify-center mb-4">
              <span className="text-4xl lg:text-5xl mr-3">{categoryIcons[selectedCategory]}</span>
              <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                {selectedCategory}
              </h2>
            </div>
            <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
              {filteredItems.length} delicious {filteredItems.length === 1 ? 'option' : 'options'} to choose from
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 my-16">
          {filteredItems.length === 0 ? (
            <div className="col-span-full">
              <div className="bg-white rounded-xl p-12 text-center shadow-md border border-gray-200">
                <div className="text-6xl mb-4">🍽️</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No items available</h3>
                <p className="text-gray-600">Check back later for delicious options in this category</p>
              </div>
            </div>
          ) : (
            filteredItems.map((item) => {
              const cartItem = cartItems.find(cartItem => cartItem.id === item._id);
              const currentQuantity = cartItem ? cartItem.quantity : 0;
              return (
                <div
                  key={item._id}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 hover:border-orange-200 hover:-translate-y-2 transform"
                >
                  {/* Item Image */}
                  <div className="relative h-44 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                    <img
                      src={item.image?.url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x300/f9fafb/6b7280?text=No+Image';
                      }}
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/90 backdrop-blur-sm text-xs font-semibold px-2 py-1 rounded-full text-gray-700 shadow-sm">
                        {item.category}
                      </span>
                    </div>

                    {/* Price Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
                        ৳{item.price}
                      </span>
                    </div>
                  </div>

                  {/* Item Content */}
                  <div className="p-3 flex flex-col">
                    {/* Title */}
                    <div className="mb-3">
                      <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-orange-700 transition-colors duration-300">
                        {item.title}
                      </h3>
                    </div>

                    {/* Bottom Section - Quantity Controls and Button */}
                    <div className="mt-auto space-y-2">
                      {/* Quantity Controls */}
                      <div className="flex items-center justify-center">
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => decrement(item._id)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-white hover:text-orange-600 rounded-md transition-all duration-200 disabled:opacity-50"
                            disabled={currentQuantity === 0}
                          >
                            <span className="text-sm font-bold">−</span>
                          </button>
                          <span className="mx-3 min-w-[1.5rem] text-center font-bold text-gray-900 text-sm">
                            {currentQuantity}
                          </span>
                          <button
                            onClick={() => increment(item._id)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-white hover:text-orange-600 rounded-md transition-all duration-200 disabled:opacity-50"
                            disabled={currentQuantity >= 10}
                          >
                            <span className="text-sm font-bold">+</span>
                          </button>
                        </div>
                      </div>

                      {/* Add to Cart Button */}
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl text-sm"
                      >
                        {currentQuantity > 0 ? `Update ${currentQuantity} in Cart` : "Add to Cart"} • ৳{item.price * currentQuantity || item.price}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {/* <Bill orderId={orderId} /> */}
    </div>
  );
};

export default MenuContainer;
