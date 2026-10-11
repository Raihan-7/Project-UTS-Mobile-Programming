import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  addCartItem,
  CartItem,
  Category,
  checkout,
  createProduct,
  deleteProduct,
  getCart,
  getCategories,
  getOrders,
  getProducts,
  getSellerProducts,
  loginUser,
  OrderHistory,
  Product,
  ProductInput,
  registerUser,
  removeCartItem,
  SellerProduct,
  updateOrderStatus,
  updateCartItem,
  updateProduct,
  User,
} from './src/services/api';

function App(): React.JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cartError, setCartError] = useState('');
  const [orders, setOrders] = useState<OrderHistory[]>([]);
  const [ordersVisible, setOrdersVisible] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [sellerProducts, setSellerProducts] = useState<SellerProduct[]>([]);
  const [storeVisible, setStoreVisible] = useState(false);
  const [storeView, setStoreView] = useState<'list' | 'form'>('list');
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null,
  );
  const [editingProduct, setEditingProduct] =
    useState<SellerProduct | null>(null);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productCategoryId, setProductCategoryId] = useState('');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [productFormError, setProductFormError] = useState('');
  const [authVisible, setAuthVisible] = useState(false);
  const [registerMode, setRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<User['role']>('BUYER');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [productList, categoryList] = await Promise.all([
        getProducts({
          q: activeSearch,
          categoryId: selectedCategory,
        }),
        getCategories(),
      ]);

      setProducts(productList);
      setCategories(categoryList);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Tidak dapat memuat produk.',
      );
    } finally {
      setLoading(false);
    }
  }, [activeSearch, selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadCart = useCallback(async () => {
    if (!token || user?.role !== 'BUYER') {
      setCartItems([]);
      return;
    }

    setCartLoading(true);
    setCartError('');
    try {
      setCartItems(await getCart(token));
    } catch (requestError) {
      setCartError(
        requestError instanceof Error
          ? requestError.message
          : 'Keranjang tidak dapat dimuat.',
      );
    } finally {
      setCartLoading(false);
    }
  }, [token, user?.role]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const loadOrders = useCallback(async () => {
    if (!token || !user?.role) {
      setOrders([]);
      return;
    }

    setOrdersLoading(true);
    setOrdersError('');
    try {
      setOrders(await getOrders(token));
    } catch (requestError) {
      setOrdersError(
        requestError instanceof Error
          ? requestError.message
          : 'Riwayat pesanan tidak dapat dimuat.',
      );
    } finally {
      setOrdersLoading(false);
    }
  }, [token, user?.role]);

  const loadSellerProducts = useCallback(async () => {
    if (!token || user?.role !== 'SELLER') {
      setSellerProducts([]);
      return;
    }

    setStoreLoading(true);
    setStoreError('');
    try {
      setSellerProducts(await getSellerProducts(token));
    } catch (requestError) {
      setStoreError(
        requestError instanceof Error
          ? requestError.message
          : 'Produk toko tidak dapat dimuat.',
      );
    } finally {
      setStoreLoading(false);
    }
  }, [token, user?.role]);

  const beginProductForm = (product?: SellerProduct) => {
    setEditingProduct(product ?? null);
    setProductName(product?.name ?? '');
    setProductDescription(product?.description ?? '');
    setProductPrice(product ? String(product.price) : '');
    setProductStock(product ? String(product.stock) : '');
    setProductCategoryId(product?.category.id ?? categories[0]?.id ?? '');
    setProductImageUrl(product?.imageUrl ?? '');
    setProductFormError('');
    setStoreView('form');
  };

  const saveProduct = async () => {
    const cleanName = productName.trim();
    const cleanDescription = productDescription.trim();
    const price = Number(productPrice);
    const stock = Number(productStock);

    if (!cleanName || !cleanDescription || !productCategoryId) {
      setProductFormError('Lengkapi nama, deskripsi, dan kategori produk.');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setProductFormError('Harga harus berupa angka lebih dari 0.');
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setProductFormError('Stok harus berupa bilangan bulat minimal 0.');
      return;
    }

    if (!token) {
      setProductFormError('Sesi login tidak tersedia. Silakan masuk kembali.');
      return;
    }

    const productData: ProductInput = {
      name: cleanName,
      description: cleanDescription,
      price,
      stock,
      categoryId: productCategoryId,
      imageUrl: productImageUrl.trim() || null,
    };

    setSavingProduct(true);
    setProductFormError('');
    try {
      if (editingProduct) {
        await updateProduct(token, editingProduct.id, productData);
      } else {
        await createProduct(token, productData);
      }

      setStoreView('list');
      await loadSellerProducts();
      await loadData();
      Alert.alert(
        'Berhasil',
        editingProduct ? 'Produk berhasil diperbarui.' : 'Produk berhasil ditambahkan.',
      );
    } catch (requestError) {
      setProductFormError(
        requestError instanceof Error
          ? requestError.message
          : 'Produk gagal disimpan.',
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const confirmDeleteProduct = (product: SellerProduct) => {
    Alert.alert(
      'Hapus produk',
      `Produk "${product.name}" akan disembunyikan dari katalog. Lanjutkan?`,
      [
        {text: 'Batal', style: 'cancel'},
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            if (!token || deletingProductId) {
              return;
            }

            setDeletingProductId(product.id);
            setStoreError('');
            try {
              await deleteProduct(token, product.id);
              setSellerProducts(current =>
                current.filter(item => item.id !== product.id),
              );
              await loadData();
              Alert.alert('Berhasil', 'Produk berhasil dihapus.');
            } catch (requestError) {
              setStoreError(
                requestError instanceof Error
                  ? requestError.message
                  : 'Produk gagal dihapus.',
              );
            } finally {
              setDeletingProductId(null);
            }
          },
        },
      ],
    );
  };

  const advanceOrderStatus = async (order: OrderHistory) => {
    if (!token || user?.role !== 'SELLER' || updatingOrderId) {
      return;
    }

    const nextStatus =
      order.status === 'PENDING_PAYMENT'
        ? 'PROCESSING'
        : order.status === 'PROCESSING'
          ? 'COMPLETED'
          : null;

    if (!nextStatus) {
      return;
    }

    setUpdatingOrderId(order.id);
    try {
      const updatedOrder = await updateOrderStatus(
        token,
        order.id,
        nextStatus,
      );
      setOrders(current =>
        current.map(currentOrder =>
          currentOrder.id === updatedOrder.id
            ? {...currentOrder, status: updatedOrder.status}
            : currentOrder,
        ),
      );
      Alert.alert(
        'Status pesanan diperbarui',
        `Status pesanan sekarang: ${getOrderStatusLabel(updatedOrder.status)}`,
      );
    } catch (requestError) {
      Alert.alert(
        'Gagal memperbarui status',
        requestError instanceof Error
          ? requestError.message
          : 'Status pesanan tidak dapat diperbarui.',
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const formatPrice = (price: string | number) =>
    `Rp ${Number(price).toLocaleString('id-ID')}`;

  const getOrderStatusLabel = (status: OrderHistory['status']) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return 'Menunggu Pembayaran';
      case 'PROCESSING':
        return 'Diproses';
      case 'COMPLETED':
        return 'Selesai';
    }
  };

  const cartTotal = cartItems.reduce(
    (total, item) => total + Number(item.product.price) * item.quantity,
    0,
  );
  const checkoutSellerId = cartItems[0]?.product.sellerId;
  const checkoutItems = checkoutSellerId
    ? cartItems.filter(item => item.product.sellerId === checkoutSellerId)
    : [];
  const checkoutTotal = checkoutItems.reduce(
    (total, item) => total + Number(item.product.price) * item.quantity,
    0,
  );
  const hasMultipleSellers =
    new Set(cartItems.map(item => item.product.sellerId)).size > 1;

  const addProductToCart = async (product: Product) => {
    if (!token || !user) {
      Alert.alert('Masuk diperlukan', 'Masuk sebagai pembeli untuk menggunakan keranjang.', [
        {text: 'Nanti', style: 'cancel'},
        {
          text: 'Masuk',
          onPress: () => {
            setSelectedProduct(null);
            openAuth();
          },
        },
      ]);
      return;
    }

    if (user.role !== 'BUYER') {
      Alert.alert('Akun penjual', 'Keranjang hanya tersedia untuk akun pembeli.');
      return;
    }

    setCartError('');
    try {
      await addCartItem(token, product.id);
      await loadCart();
      setSelectedProduct(null);
      Alert.alert('Berhasil', 'Produk ditambahkan ke keranjang.');
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Produk gagal ditambahkan.';
      setCartError(message);
      Alert.alert('Gagal menambahkan produk', message);
    }
  };

  const changeItemQuantity = async (item: CartItem, quantity: number) => {
    if (!token) {
      return;
    }

    setCartError('');
    try {
      if (quantity < 1) {
        await removeCartItem(token, item.id);
      } else {
        await updateCartItem(token, item.id, quantity);
      }
      await loadCart();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Keranjang gagal diperbarui.';
      setCartError(message);
      Alert.alert('Gagal memperbarui keranjang', message);
    }
  };

  const submitCheckout = () => {
    if (!token || checkoutItems.length === 0 || checkoutLoading) {
      return;
    }

    const remainingItemCount = cartItems.length - checkoutItems.length;
    const message =
      remainingItemCount > 0
        ? `Pesanan ini berisi ${checkoutItems.length} item dari satu penjual dengan total ${formatPrice(checkoutTotal)}. Item dari penjual lain tetap berada di keranjang dan perlu checkout terpisah.`
        : `Buat pesanan untuk ${checkoutItems.length} item dengan total ${formatPrice(checkoutTotal)}?`;

    Alert.alert('Konfirmasi checkout', message, [
      {text: 'Batal', style: 'cancel'},
      {
        text: 'Buat pesanan',
        onPress: async () => {
          setCheckoutLoading(true);
          setCartError('');
          try {
            const order = await checkout(
              token,
              checkoutItems.map(item => item.id),
            );
            setCartItems(current =>
              current.filter(
                item => !checkoutItems.some(checked => checked.id === item.id),
              ),
            );
            await loadCart();
            Alert.alert(
              'Pesanan berhasil dibuat',
              `Nomor pesanan: ${order.id}\nStatus: Menunggu Pembayaran\nTotal: ${formatPrice(order.total)}`,
            );
          } catch (requestError) {
            const errorMessage =
              requestError instanceof Error
                ? requestError.message
                : 'Checkout gagal.';
            setCartError(errorMessage);
            Alert.alert('Checkout gagal', errorMessage);
          } finally {
            setCheckoutLoading(false);
          }
        },
      },
    ]);
  };

  const submitAuth = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password || (registerMode && !cleanName)) {
      setAuthError('Lengkapi semua data yang diperlukan.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      if (registerMode) {
        await registerUser(cleanName, cleanEmail, password, role);
        setRegisterMode(false);
        setPassword('');
        setAuthNotice(
          'Pendaftaran berhasil. Silakan masuk menggunakan email dan password yang baru dibuat.',
        );
        return;
      }

      setAuthNotice('');
      const result = await loginUser(cleanEmail, password);
      setToken(result.token);
      setUser(result.user);
      setPassword('');
      setAuthVisible(false);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Terjadi kesalahan.';
      setAuthError(registerMode ? `Pendaftaran gagal: ${message}` : message);
    } finally {
      setAuthLoading(false);
    }
  };

  const openAuth = () => {
    setAuthError('');
    setAuthNotice('');
    setAuthVisible(true);
  };

  const signOut = () => {
    setToken(null);
    setUser(null);
    setCartItems([]);
    setOrders([]);
    setSellerProducts([]);
    setCartVisible(false);
    setOrdersVisible(false);
    setStoreVisible(false);
    setUpdatingOrderId(null);
    setPassword('');
    setAuthError('');
    setAuthNotice('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#164e8a" />

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.brand}>Manikamu</Text>
          <Text style={styles.tagline}>Aksesoris manik-manik pilihanmu</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={user ? signOut : openAuth}
          style={styles.authHeaderButton}>
          <Text style={styles.authHeaderButtonText}>
            {user ? 'Keluar' : 'Masuk'}
          </Text>
        </TouchableOpacity>
        {user?.role === 'BUYER' && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              setCartVisible(true);
              loadCart();
            }}
            style={styles.cartHeaderButton}>
            <Text style={styles.cartHeaderButtonText}>
              Keranjang{cartItems.length ? ` (${cartItems.length})` : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {user && (
        <View style={styles.welcomeBanner}>
          <Text style={styles.welcomeText}>
            Halo, {user.name} · {user.role === 'BUYER' ? 'Pembeli' : 'Penjual'}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Temukan perhiasan favoritmu</Text>
        <Text style={styles.intro}>
          Gelang, kalung, dan aksesoris manik-manik buatan penuh cinta.
        </Text>
        {user && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              setOrdersVisible(true);
              loadOrders();
            }}
            style={styles.orderHistoryButton}>
            <Text style={styles.orderHistoryButtonText}>
              {user.role === 'BUYER' ? 'Riwayat Pesanan' : 'Kelola Pesanan'}
            </Text>
          </TouchableOpacity>
        )}
        {user?.role === 'SELLER' && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              setStoreVisible(true);
              setStoreView('list');
              loadSellerProducts();
            }}
            style={styles.orderHistoryButton}>
            <Text style={styles.orderHistoryButtonText}>Kelola Toko</Text>
          </TouchableOpacity>
        )}

        <View style={styles.searchRow}>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => setActiveSearch(searchText)}
            placeholder="Cari gelang, kalung..."
            placeholderTextColor="#8795a5"
            returnKeyType="search"
            style={styles.searchInput}
          />
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setActiveSearch(searchText)}
            style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Cari</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Kategori</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}>
          <TouchableOpacity
            onPress={() => setSelectedCategory('')}
            style={[
              styles.categoryChip,
              selectedCategory === '' && styles.categoryChipActive,
            ]}>
            <Text
              style={[
                styles.categoryText,
                selectedCategory === '' && styles.categoryTextActive,
              ]}>
              Semua
            </Text>
          </TouchableOpacity>

          {categories.map(category => {
            const isSelected = selectedCategory === category.id;

            return (
              <TouchableOpacity
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipActive,
                ]}>
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextActive,
                  ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.productsHeading}>
          <Text style={styles.sectionTitle}>Produk pilihan</Text>
          <TouchableOpacity onPress={() => loadData()}>
            <Text style={styles.refreshText}>Muat ulang</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            color="#246bb2"
            size="large"
            style={styles.loader}
          />
        ) : error ? (
          <View style={styles.messageBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => loadData()}>
              <Text style={styles.retryText}>Coba lagi</Text>
            </TouchableOpacity>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.messageBox}>
            <Text style={styles.emptyTitle}>Produk belum tersedia</Text>
            <Text style={styles.emptyText}>
              Coba kategori atau kata pencarian lain.
            </Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {products.map(product => (
              <TouchableOpacity
                key={product.id}
                activeOpacity={0.85}
                onPress={() => setSelectedProduct(product)}
                style={styles.productCard}>
                {product.imageUrl ? (
                  <Image
                    source={{uri: product.imageUrl}}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.productImage, styles.imagePlaceholder]}>
                    <Text style={styles.placeholderEmoji}>💎</Text>
                    <Text style={styles.placeholderText}>Foto produk</Text>
                  </View>
                )}

                <View style={styles.productInfo}>
                  <Text numberOfLines={1} style={styles.productName}>
                    {product.name}
                  </Text>
                  <Text style={styles.productPrice}>
                    {formatPrice(product.price)}
                  </Text>
                  <Text style={styles.productMeta}>
                    {product.category?.name ?? 'Aksesoris'} · Stok {product.stock}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={selectedProduct !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedProduct(null)}>
        <View style={styles.detailBackdrop}>
          <View style={styles.detailSheet}>
            <TouchableOpacity
              onPress={() => setSelectedProduct(null)}
              style={styles.closeButton}>
              <Text style={styles.closeText}>Tutup</Text>
            </TouchableOpacity>

            {selectedProduct?.imageUrl ? (
              <Image
                source={{uri: selectedProduct.imageUrl}}
                style={styles.detailImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.detailImage, styles.detailImagePlaceholder]}>
                <Text style={styles.placeholderEmoji}>💎</Text>
                <Text style={styles.placeholderText}>
                  Foto produk belum tersedia
                </Text>
              </View>
            )}

            <Text style={styles.detailName}>{selectedProduct?.name}</Text>
            <Text style={styles.detailPrice}>
              {selectedProduct ? formatPrice(selectedProduct.price) : ''}
            </Text>
            <Text style={styles.detailMeta}>
              Kategori: {selectedProduct?.category?.name ?? 'Aksesoris'}
            </Text>
            <Text style={styles.detailMeta}>
              Stok tersedia: {selectedProduct?.stock}
            </Text>
            <Text style={styles.detailDescription}>
              {selectedProduct?.description}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={!selectedProduct || selectedProduct.stock < 1}
              onPress={() => {
                if (selectedProduct) {
                  addProductToCart(selectedProduct);
                }
              }}
              style={[
                styles.addCartButton,
                (!selectedProduct || selectedProduct.stock < 1) &&
                  styles.disabledButton,
              ]}>
              <Text style={styles.addCartButtonText}>
                {selectedProduct?.stock === 0
                  ? 'Stok habis'
                  : 'Tambah ke keranjang'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={cartVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCartVisible(false)}>
        <View style={styles.detailBackdrop}>
          <View style={styles.cartSheet}>
            <View style={styles.cartTitleRow}>
              <Text style={styles.detailName}>Keranjang belanja</Text>
              <TouchableOpacity
                onPress={() => setCartVisible(false)}
                style={styles.closeButton}>
                <Text style={styles.closeText}>Tutup</Text>
              </TouchableOpacity>
            </View>
            {cartLoading ? (
              <ActivityIndicator color="#246bb2" style={styles.loader} />
            ) : cartError ? (
              <View style={styles.messageBox}>
                <Text style={styles.errorText}>{cartError}</Text>
                <TouchableOpacity onPress={loadCart}>
                  <Text style={styles.retryText}>Coba lagi</Text>
                </TouchableOpacity>
              </View>
            ) : cartItems.length === 0 ? (
              <Text style={styles.emptyText}>Keranjang Anda masih kosong.</Text>
            ) : (
              <ScrollView>
                {cartItems.map(item => (
                  <View key={item.id} style={styles.cartItem}>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.productName}>
                        {item.product.name}
                      </Text>
                      <Text style={styles.productPrice}>
                        {formatPrice(item.product.price)}
                      </Text>
                      <Text style={styles.productMeta}>
                        Subtotal:{' '}
                        {formatPrice(
                          Number(item.product.price) * item.quantity,
                        )}
                      </Text>
                    </View>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() =>
                          changeItemQuantity(item, item.quantity - 1)
                        }
                        style={styles.quantityButton}>
                        <Text style={styles.quantityButtonText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        disabled={item.quantity >= item.product.stock}
                        onPress={() =>
                          changeItemQuantity(item, item.quantity + 1)
                        }
                        style={[
                          styles.quantityButton,
                          item.quantity >= item.product.stock &&
                            styles.disabledButton,
                        ]}>
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <View style={styles.cartTotalRow}>
                  <Text style={styles.cartTotalLabel}>Total</Text>
                  <Text style={styles.cartTotalValue}>
                    {formatPrice(cartTotal)}
                  </Text>
                </View>
                <Text style={styles.productMeta}>
                  {hasMultipleSellers
                    ? 'Pesanan diproses per penjual. Checkout hanya akan membuat pesanan untuk item dari penjual pertama; item lainnya tetap di keranjang.'
                    : 'Pesanan akan dibuat dengan status Menunggu Pembayaran.'}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={checkoutLoading || cartLoading}
                  onPress={submitCheckout}
                  style={[
                    styles.checkoutButton,
                    (checkoutLoading || cartLoading) &&
                      styles.disabledButton,
                  ]}>
                  {checkoutLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.checkoutButtonText}>
                      {hasMultipleSellers
                        ? `Checkout ${checkoutItems.length} item · ${formatPrice(checkoutTotal)}`
                        : `Checkout · ${formatPrice(cartTotal)}`}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={ordersVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOrdersVisible(false)}>
        <View style={styles.detailBackdrop}>
          <View style={styles.orderHistorySheet}>
            <View style={styles.cartTitleRow}>
              <View>
                <Text style={styles.detailName}>
                  {user?.role === 'SELLER' ? 'Kelola Pesanan' : 'Riwayat Pesanan'}
                </Text>
                <Text style={styles.productMeta}>
                  {user?.role === 'SELLER'
                    ? 'Pesanan dari pembeli toko Anda'
                    : 'Pesanan terbaru Anda'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setOrdersVisible(false)}
                style={styles.closeButton}>
                <Text style={styles.closeText}>Tutup</Text>
              </TouchableOpacity>
            </View>
            {ordersLoading ? (
              <ActivityIndicator color="#246bb2" style={styles.loader} />
            ) : ordersError ? (
              <View style={styles.messageBox}>
                <Text style={styles.errorText}>{ordersError}</Text>
                <TouchableOpacity onPress={loadOrders}>
                  <Text style={styles.retryText}>Coba lagi</Text>
                </TouchableOpacity>
              </View>
            ) : orders.length === 0 ? (
              <View style={styles.messageBox}>
                <Text style={styles.emptyTitle}>Belum ada pesanan</Text>
                <Text style={styles.emptyText}>
                  Pesanan yang sudah dibuat akan tampil di sini.
                </Text>
              </View>
            ) : (
              <ScrollView>
                {orders.map(order => (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderHeading}>
                      <View style={styles.orderHeadingText}>
                        <Text style={styles.orderSeller}>
                          {user?.role === 'SELLER'
                            ? `Pembeli: ${order.buyer.name}`
                            : `Toko: ${order.seller.name}`}
                        </Text>
                        <Text style={styles.orderDate}>
                          {new Date(order.createdAt).toLocaleString('id-ID')}
                        </Text>
                      </View>
                      <Text style={styles.orderStatus}>
                        {getOrderStatusLabel(order.status)}
                      </Text>
                    </View>
                    {order.items.map(item => (
                      <View key={item.id} style={styles.orderItem}>
                        <Text style={styles.orderItemName}>{item.name}</Text>
                        <Text style={styles.orderItemMeta}>
                          {item.quantity} × {formatPrice(item.unitPrice)}
                        </Text>
                      </View>
                    ))}
                    <View style={styles.orderTotalRow}>
                      <Text style={styles.orderTotalLabel}>Total pesanan</Text>
                      <Text style={styles.orderTotalValue}>
                        {formatPrice(order.total)}
                      </Text>
                    </View>
                    {user?.role === 'SELLER' &&
                      order.status !== 'COMPLETED' && (
                        <TouchableOpacity
                          accessibilityRole="button"
                          disabled={updatingOrderId !== null}
                          onPress={() => advanceOrderStatus(order)}
                          style={[
                            styles.orderActionButton,
                            updatingOrderId !== null &&
                              styles.disabledButton,
                          ]}>
                          {updatingOrderId === order.id ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={styles.orderActionButtonText}>
                              {order.status === 'PENDING_PAYMENT'
                                ? 'Tandai Diproses'
                                : 'Tandai Selesai'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                    <Text style={styles.orderId}>ID: {order.id}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={storeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!savingProduct) {
            setStoreVisible(false);
            setStoreView('list');
          }
        }}>
        <View style={styles.detailBackdrop}>
          <View style={styles.storeSheet}>
            <View style={styles.cartTitleRow}>
              <View>
                <Text style={styles.detailName}>
                  {storeView === 'form'
                    ? editingProduct
                      ? 'Edit Produk'
                      : 'Tambah Produk'
                    : 'Kelola Toko'}
                </Text>
                <Text style={styles.productMeta}>
                  {storeView === 'form'
                    ? 'Atur informasi produk tokomu'
                    : `${sellerProducts.length} produk aktif`}
                </Text>
              </View>
              <TouchableOpacity
                disabled={savingProduct}
                onPress={() => {
                  setStoreVisible(false);
                  setStoreView('list');
                }}
                style={styles.closeButton}>
                <Text style={styles.closeText}>Tutup</Text>
              </TouchableOpacity>
            </View>

            {storeView === 'form' ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.storeFormContent}>
                <TextInput
                  value={productName}
                  onChangeText={setProductName}
                  placeholder="Nama produk"
                  placeholderTextColor="#8795a5"
                  style={styles.authInput}
                  maxLength={120}
                />
                <TextInput
                  value={productDescription}
                  onChangeText={setProductDescription}
                  placeholder="Deskripsi produk"
                  placeholderTextColor="#8795a5"
                  multiline
                  style={[styles.authInput, styles.productDescriptionInput]}
                  textAlignVertical="top"
                />
                <View style={styles.productNumberRow}>
                  <TextInput
                    value={productPrice}
                    onChangeText={setProductPrice}
                    placeholder="Harga (Rp)"
                    placeholderTextColor="#8795a5"
                    keyboardType="decimal-pad"
                    style={[styles.authInput, styles.productNumberInput]}
                  />
                  <TextInput
                    value={productStock}
                    onChangeText={setProductStock}
                    placeholder="Stok"
                    placeholderTextColor="#8795a5"
                    keyboardType="number-pad"
                    style={[styles.authInput, styles.productNumberInput]}
                  />
                </View>
                <Text style={styles.roleLabel}>Kategori</Text>
                {categories.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Belum ada kategori. Tambahkan kategori terlebih dahulu
                    melalui endpoint kategori.
                  </Text>
                ) : (
                  <View style={styles.storeCategoryList}>
                    {categories.map(category => {
                      const selected = productCategoryId === category.id;
                      return (
                        <TouchableOpacity
                          key={category.id}
                          onPress={() => setProductCategoryId(category.id)}
                          style={[
                            styles.categoryChip,
                            selected && styles.categoryChipActive,
                          ]}>
                          <Text
                            style={[
                              styles.categoryText,
                              selected && styles.categoryTextActive,
                            ]}>
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                <TextInput
                  value={productImageUrl}
                  onChangeText={setProductImageUrl}
                  placeholder="URL gambar (opsional)"
                  placeholderTextColor="#8795a5"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={styles.authInput}
                />
                {!!productFormError && (
                  <Text accessibilityRole="alert" style={styles.authError}>
                    {productFormError}
                  </Text>
                )}
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={savingProduct || categories.length === 0}
                  onPress={saveProduct}
                  style={[
                    styles.submitAuthButton,
                    (savingProduct || categories.length === 0) &&
                      styles.disabledButton,
                  ]}>
                  {savingProduct ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitAuthText}>
                      {editingProduct ? 'Simpan Perubahan' : 'Simpan Produk'}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={savingProduct}
                  onPress={() => setStoreView('list')}
                  style={styles.authSwitch}>
                  <Text style={styles.authSwitchText}>Kembali ke daftar produk</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => beginProductForm()}
                  style={styles.addStoreProductButton}>
                  <Text style={styles.orderActionButtonText}>
                    + Tambah Produk
                  </Text>
                </TouchableOpacity>
                {storeLoading ? (
                  <ActivityIndicator color="#246bb2" style={styles.loader} />
                ) : storeError ? (
                  <View style={styles.messageBox}>
                    <Text style={styles.errorText}>{storeError}</Text>
                    <TouchableOpacity onPress={loadSellerProducts}>
                      <Text style={styles.retryText}>Coba lagi</Text>
                    </TouchableOpacity>
                  </View>
                ) : sellerProducts.length === 0 ? (
                  <View style={styles.messageBox}>
                    <Text style={styles.emptyTitle}>Belum ada produk</Text>
                    <Text style={styles.emptyText}>
                      Tambahkan produk pertama untuk mulai mengelola tokomu.
                    </Text>
                  </View>
                ) : (
                  <ScrollView>
                    {sellerProducts.map(product => (
                      <View key={product.id} style={styles.storeProductCard}>
                        {product.imageUrl ? (
                          <Image
                            source={{uri: product.imageUrl}}
                            style={styles.storeProductImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={[
                              styles.storeProductImage,
                              styles.imagePlaceholder,
                            ]}>
                            <Text style={styles.placeholderEmoji}>💎</Text>
                          </View>
                        )}
                        <View style={styles.storeProductInfo}>
                          <Text numberOfLines={1} style={styles.productName}>
                            {product.name}
                          </Text>
                          <Text style={styles.productPrice}>
                            {formatPrice(product.price)}
                          </Text>
                          <Text style={styles.productMeta}>
                            {product.category.name} · Stok {product.stock}
                          </Text>
                          <View style={styles.storeProductActions}>
                            <TouchableOpacity
                              disabled={deletingProductId !== null}
                              onPress={() => beginProductForm(product)}
                              style={styles.storeEditButton}>
                              <Text style={styles.storeEditButtonText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              disabled={deletingProductId !== null}
                              onPress={() => confirmDeleteProduct(product)}
                              style={styles.storeDeleteButton}>
                              {deletingProductId === product.id ? (
                                <ActivityIndicator color="#a33434" />
                              ) : (
                                <Text style={styles.storeDeleteButtonText}>
                                  Hapus
                                </Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={authVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAuthVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.authBackdrop}>
          <View style={styles.authSheet}>
            <View style={styles.authTitleRow}>
              <View>
                <Text style={styles.authTitle}>
                  {registerMode ? 'Buat akun' : 'Selamat datang'}
                </Text>
                <Text style={styles.authSubtitle}>
                  {registerMode
                    ? 'Daftar untuk mulai menggunakan Manikamu'
                    : 'Masuk ke akun Manikamu Anda'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAuthVisible(false)}
                style={styles.closeButton}>
                <Text style={styles.closeText}>Tutup</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {registerMode && (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Nama lengkap"
                  placeholderTextColor="#8795a5"
                  autoCapitalize="words"
                  style={styles.authInput}
                />
              )}
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#8795a5"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.authInput}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#8795a5"
                secureTextEntry
                style={styles.authInput}
              />

              {registerMode && (
                <>
                  <Text style={styles.roleLabel}>Daftar sebagai</Text>
                  <View style={styles.roleOptions}>
                    {(['BUYER', 'SELLER'] as const).map(option => {
                      const selected = role === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          onPress={() => setRole(option)}
                          style={[
                            styles.roleOption,
                            selected && styles.roleOptionSelected,
                          ]}>
                          <Text
                            style={[
                              styles.roleOptionText,
                              selected && styles.roleOptionTextSelected,
                            ]}>
                            {option === 'BUYER' ? 'Pembeli' : 'Penjual'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {!!authError && (
                <Text accessibilityRole="alert" style={styles.authError}>
                  {authError}
                </Text>
              )}
              {!!authNotice && (
                <Text accessibilityRole="alert" style={styles.authNotice}>
                  {authNotice}
                </Text>
              )}

              <TouchableOpacity
                accessibilityRole="button"
                disabled={authLoading}
                onPress={submitAuth}
                style={[
                  styles.submitAuthButton,
                  authLoading && styles.submitAuthButtonDisabled,
                ]}>
                {authLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitAuthText}>
                    {registerMode ? 'Daftar dan masuk' : 'Masuk'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setRegisterMode(!registerMode);
                  setAuthError('');
                  setAuthNotice('');
                }}
                style={styles.authSwitch}>
                <Text style={styles.authSwitchText}>
                  {registerMode
                    ? 'Sudah punya akun? Masuk'
                    : 'Belum punya akun? Daftar'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f7fc',
  },
  header: {
    backgroundColor: '#164e8a',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  brand: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagline: {
    color: '#d8eaff',
    fontSize: 13,
    marginTop: 4,
  },
  authHeaderButton: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginLeft: 10,
  },
  authHeaderButtonText: {
    color: '#164e8a',
    fontWeight: '700',
    fontSize: 13,
  },
  cartHeaderButton: {
    backgroundColor: '#d8eaff',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginLeft: 8,
  },
  cartHeaderButtonText: {
    color: '#164e8a',
    fontWeight: '700',
    fontSize: 12,
  },
  welcomeBanner: {
    backgroundColor: '#e4effa',
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  welcomeText: {
    color: '#164e8a',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  pageTitle: {
    color: '#19324d',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  intro: {
    color: '#687b8e',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 16,
  },
  orderHistoryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#e4effa',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  orderHistoryButtonText: {
    color: '#164e8a',
    fontSize: 13,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    height: 46,
    backgroundColor: '#fff',
    borderColor: '#dce6f0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    color: '#19324d',
  },
  searchButton: {
    backgroundColor: '#246bb2',
    paddingHorizontal: 17,
    justifyContent: 'center',
    borderRadius: 12,
    marginLeft: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#19324d',
    fontSize: 17,
    fontWeight: '800',
  },
  categoryRow: {
    paddingTop: 10,
    paddingBottom: 18,
  },
  categoryChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dce6f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 9,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#246bb2',
    borderColor: '#246bb2',
  },
  categoryText: {
    color: '#536b82',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#fff',
  },
  productsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  refreshText: {
    color: '#246bb2',
    fontSize: 13,
    fontWeight: '700',
  },
  loader: {
    marginTop: 35,
  },
  messageBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    color: '#a33434',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryText: {
    color: '#246bb2',
    fontWeight: '700',
  },
  emptyTitle: {
    color: '#19324d',
    fontWeight: '700',
  },
  emptyText: {
    color: '#687b8e',
    marginTop: 5,
    textAlign: 'center',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#e8eef5',
  },
  productImage: {
    width: '100%',
    height: 145,
    backgroundColor: '#e9f1fa',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 33,
  },
  placeholderText: {
    color: '#71869a',
    fontSize: 11,
    marginTop: 4,
  },
  productInfo: {
    padding: 11,
  },
  productName: {
    color: '#19324d',
    fontWeight: '700',
    fontSize: 14,
  },
  productPrice: {
    color: '#246bb2',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  productMeta: {
    color: '#7b8997',
    fontSize: 11,
    marginTop: 5,
  },
  detailBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 35, 55, 0.5)',
  },
  detailSheet: {
    backgroundColor: '#fff',
    padding: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '85%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  closeText: {
    color: '#246bb2',
    fontWeight: '700',
  },
  detailImage: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    backgroundColor: '#e9f1fa',
    marginBottom: 16,
  },
  detailImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailName: {
    color: '#19324d',
    fontSize: 21,
    fontWeight: '800',
  },
  detailPrice: {
    color: '#246bb2',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  detailMeta: {
    color: '#687b8e',
    fontSize: 13,
    marginTop: 7,
  },
  detailDescription: {
    color: '#3d5368',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
  },
  addCartButton: {
    backgroundColor: '#246bb2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  addCartButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.45,
  },
  cartSheet: {
    backgroundColor: '#f8fbff',
    padding: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '85%',
  },
  orderHistorySheet: {
    backgroundColor: '#f8fbff',
    padding: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '85%',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8eef5',
  },
  orderHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderHeadingText: {
    flex: 1,
    paddingRight: 8,
  },
  orderSeller: {
    color: '#19324d',
    fontSize: 14,
    fontWeight: '700',
  },
  orderDate: {
    color: '#7b8997',
    fontSize: 11,
    marginTop: 4,
  },
  orderStatus: {
    color: '#246bb2',
    backgroundColor: '#e4effa',
    borderRadius: 10,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: '#eef2f6',
  },
  orderItemName: {
    flex: 1,
    paddingRight: 8,
    color: '#3d5368',
    fontSize: 13,
  },
  orderItemMeta: {
    color: '#687b8e',
    fontSize: 12,
  },
  orderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#dce6f0',
    paddingTop: 10,
    marginTop: 4,
  },
  orderTotalLabel: {
    color: '#19324d',
    fontSize: 13,
    fontWeight: '700',
  },
  orderTotalValue: {
    color: '#246bb2',
    fontSize: 15,
    fontWeight: '800',
  },
  orderActionButton: {
    minHeight: 42,
    backgroundColor: '#246bb2',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  orderActionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  orderId: {
    color: '#9aa6b2',
    fontSize: 10,
    marginTop: 8,
  },
  storeSheet: {
    backgroundColor: '#f8fbff',
    padding: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '90%',
  },
  storeFormContent: {
    paddingBottom: 8,
  },
  productDescriptionInput: {
    minHeight: 100,
    paddingTop: 12,
  },
  productNumberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productNumberInput: {
    width: '48%',
  },
  storeCategoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  addStoreProductButton: {
    minHeight: 44,
    backgroundColor: '#246bb2',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  storeProductCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e8eef5',
  },
  storeProductImage: {
    width: 86,
    height: 92,
    borderRadius: 10,
    backgroundColor: '#e9f1fa',
  },
  storeProductInfo: {
    flex: 1,
    paddingLeft: 11,
    justifyContent: 'center',
  },
  storeProductActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  storeEditButton: {
    backgroundColor: '#e4effa',
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginRight: 8,
  },
  storeEditButtonText: {
    color: '#164e8a',
    fontSize: 12,
    fontWeight: '700',
  },
  storeDeleteButton: {
    minWidth: 58,
    alignItems: 'center',
    backgroundColor: '#fdeeee',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  storeDeleteButtonText: {
    color: '#a33434',
    fontSize: 12,
    fontWeight: '700',
  },
  cartTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartItem: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8eef5',
  },
  cartItemInfo: {
    flex: 1,
    paddingRight: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#e4effa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#164e8a',
    fontSize: 19,
    fontWeight: '700',
  },
  quantityText: {
    minWidth: 30,
    textAlign: 'center',
    color: '#19324d',
    fontWeight: '700',
  },
  cartTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#dce6f0',
    paddingTop: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  cartTotalLabel: {
    color: '#19324d',
    fontSize: 16,
    fontWeight: '700',
  },
  cartTotalValue: {
    color: '#246bb2',
    fontSize: 17,
    fontWeight: '800',
  },
  checkoutButton: {
    minHeight: 48,
    backgroundColor: '#246bb2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  authBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 35, 55, 0.5)',
  },
  authSheet: {
    backgroundColor: '#f8fbff',
    padding: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '90%',
  },
  authTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  authTitle: {
    color: '#19324d',
    fontSize: 22,
    fontWeight: '800',
  },
  authSubtitle: {
    color: '#687b8e',
    fontSize: 12,
    marginTop: 4,
  },
  authInput: {
    height: 48,
    backgroundColor: '#fff',
    borderColor: '#dce6f0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    color: '#19324d',
    marginBottom: 11,
  },
  roleLabel: {
    color: '#536b82',
    fontWeight: '700',
    fontSize: 13,
    marginTop: 3,
    marginBottom: 9,
  },
  roleOptions: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  roleOption: {
    backgroundColor: '#fff',
    borderColor: '#dce6f0',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginRight: 9,
  },
  roleOptionSelected: {
    backgroundColor: '#246bb2',
    borderColor: '#246bb2',
  },
  roleOptionText: {
    color: '#536b82',
    fontSize: 13,
    fontWeight: '600',
  },
  roleOptionTextSelected: {
    color: '#fff',
  },
  authError: {
    color: '#a33434',
    fontSize: 13,
    marginTop: 3,
    marginBottom: 8,
  },
  authNotice: {
    color: '#17633d',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
    marginBottom: 8,
  },
  submitAuthButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#246bb2',
    borderRadius: 12,
    marginTop: 6,
  },
  submitAuthButtonDisabled: {
    opacity: 0.65,
  },
  submitAuthText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  authSwitch: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 4,
  },
  authSwitchText: {
    color: '#246bb2',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default App;
