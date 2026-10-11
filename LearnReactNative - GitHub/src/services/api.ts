const API_BASE_URL = 'http://10.0.2.2:3000/api';

export type Category = {
  id: string;
  name: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: string | number;
  stock: number;
  imageUrl: string | null;
  category: Category;
};

export type SellerProduct = Product & {
  sellerId: string;
};

export type ProductInput = {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  imageUrl: string | null;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'BUYER' | 'SELLER';
};

export type LoginResponse = {
  token: string;
  user: User;
};

export type CartItem = {
  id: string;
  quantity: number;
  product: Product & {
    isActive: boolean;
    sellerId: string;
  };
};

export type Order = {
  id: string;
  status: 'PENDING_PAYMENT' | 'PROCESSING' | 'COMPLETED';
  total: string | number;
  createdAt: string;
};

export type OrderHistory = Order & {
  buyer: {
    id: string;
    name: string;
  };
  seller: {
    id: string;
    name: string;
  };
  items: Array<{
    id: string;
    name: string;
    unitPrice: string | number;
    quantity: number;
    product: {
      id: string;
      name: string;
      imageUrl: string | null;
    };
  }>;
};

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function request(
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: object;
    allowEmptyResponse?: boolean;
    token?: string;
  },
): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options?.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(options?.body ? {'Content-Type': 'application/json'} : {}),
      ...(options?.token
        ? {Authorization: `Bearer ${options.token}`}
        : {}),
    },
    ...(options?.body ? {body: JSON.stringify(options.body)} : {}),
  });

  const raw = await response.text();
  let result: unknown;

  if (raw.trim()) {
    try {
      result = JSON.parse(raw) as unknown;
    } catch {
      throw new Error(
        `${path} memberi respons bukan JSON (HTTP ${response.status}).`,
      );
    }
  }

  if (!response.ok) {
    const message =
      isJsonObject(result) && typeof result.message === 'string'
        ? result.message
        : `${path} gagal (HTTP ${response.status}).`;

    throw new Error(message);
  }

  if (!raw.trim() && !options?.allowEmptyResponse) {
    throw new Error(`${path} mengembalikan respons kosong (HTTP ${response.status}).`);
  }

  return result;
}

async function getData<T>(path: string): Promise<T> {
  const result = await request(path);

  if (!isJsonObject(result) || !('data' in result)) {
    throw new Error(`${path} tidak mengembalikan field "data".`);
  }

  return result.data as T;
}

async function postJson(
  path: string,
  body: object,
): Promise<unknown> {
  return request(path, {method: 'POST', body});
}

async function authenticatedRequest(
  path: string,
  token: string,
  options?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: object;
    allowEmptyResponse?: boolean;
  },
): Promise<unknown> {
  return request(path, {...options, token});
}

export const getProducts = (options?: {
  q?: string;
  categoryId?: string;
}): Promise<Product[]> => {
  const params: string[] = [];

  if (options?.q?.trim()) {
    params.push(`q=${encodeURIComponent(options.q.trim())}`);
  }

  if (options?.categoryId) {
    params.push(`categoryId=${encodeURIComponent(options.categoryId)}`);
  }

  const query = params.length > 0 ? `?${params.join('&')}` : '';

  return getData<Product[]>(`/products${query}`);
};

export const getSellerProducts = async (
  token: string,
): Promise<SellerProduct[]> => {
  const response = await authenticatedRequest('/products/mine', token);

  if (!isJsonObject(response) || !Array.isArray(response.data)) {
    throw new Error('/products/mine tidak mengembalikan daftar produk.');
  }

  return response.data.map((entry, index) => {
    if (
      !isJsonObject(entry) ||
      typeof entry.id !== 'string' ||
      typeof entry.sellerId !== 'string' ||
      typeof entry.name !== 'string' ||
      typeof entry.description !== 'string' ||
      (typeof entry.price !== 'string' && typeof entry.price !== 'number') ||
      typeof entry.stock !== 'number' ||
      (typeof entry.imageUrl !== 'string' && entry.imageUrl !== null) ||
      !isJsonObject(entry.category) ||
      typeof entry.category.id !== 'string' ||
      typeof entry.category.name !== 'string'
    ) {
      throw new Error(
        `/products/mine mengembalikan produk tidak valid (item ${index + 1}).`,
      );
    }

    return {
      id: entry.id,
      sellerId: entry.sellerId,
      name: entry.name,
      description: entry.description,
      price: entry.price,
      stock: entry.stock,
      imageUrl: entry.imageUrl,
      category: {
        id: entry.category.id,
        name: entry.category.name,
      },
    };
  });
};

export const createProduct = async (
  token: string,
  product: ProductInput,
): Promise<void> => {
  const response = await authenticatedRequest('/products', token, {
    method: 'POST',
    body: product,
  });

  if (!isJsonObject(response) || !isJsonObject(response.data) ||
      typeof response.data.id !== 'string') {
    throw new Error('/products tidak mengembalikan produk yang valid.');
  }
};

export const updateProduct = async (
  token: string,
  productId: string,
  product: ProductInput,
): Promise<void> => {
  const response = await authenticatedRequest(
    `/products/${encodeURIComponent(productId)}`,
    token,
    {
      method: 'PATCH',
      body: product,
    },
  );

  if (!isJsonObject(response) || !isJsonObject(response.data) ||
      response.data.id !== productId) {
    throw new Error('/products tidak mengembalikan produk yang diperbarui.');
  }
};

export const deleteProduct = async (
  token: string,
  productId: string,
): Promise<void> => {
  const response = await authenticatedRequest(
    `/products/${encodeURIComponent(productId)}`,
    token,
    {method: 'DELETE'},
  );

  if (!isJsonObject(response) || typeof response.message !== 'string') {
    throw new Error('/products tidak mengonfirmasi penghapusan produk.');
  }
};

export const getCategories = (): Promise<Category[]> => {
  return getData<Category[]>('/categories');
};

export const getCart = async (
  token: string,
): Promise<CartItem[]> => {
  const response = await authenticatedRequest('/cart', token);

  if (!isJsonObject(response) || !isJsonObject(response.data)) {
    throw new Error('/cart tidak mengembalikan data keranjang.');
  }

  const items = response.data.items;
  if (!Array.isArray(items)) {
    throw new Error('/cart tidak mengembalikan daftar items.');
  }

  return items as CartItem[];
};

export const addCartItem = async (
  token: string,
  productId: string,
  quantity = 1,
): Promise<void> => {
  await authenticatedRequest('/cart/items', token, {
    method: 'POST',
    body: {productId, quantity},
  });
};

export const updateCartItem = async (
  token: string,
  itemId: string,
  quantity: number,
): Promise<void> => {
  await authenticatedRequest(`/cart/items/${encodeURIComponent(itemId)}`, token, {
    method: 'PATCH',
    body: {quantity},
  });
};

export const removeCartItem = async (
  token: string,
  itemId: string,
): Promise<void> => {
  await authenticatedRequest(`/cart/items/${encodeURIComponent(itemId)}`, token, {
    method: 'DELETE',
  });
};

export const checkout = async (
  token: string,
  cartItemIds: string[],
): Promise<Order> => {
  const response = await authenticatedRequest('/orders', token, {
    method: 'POST',
    body: {cartItemIds},
  });

  if (
    !isJsonObject(response) ||
    !isJsonObject(response.data) ||
    typeof response.data.id !== 'string' ||
    typeof response.data.status !== 'string' ||
    (typeof response.data.total !== 'string' &&
      typeof response.data.total !== 'number')
  ) {
    throw new Error('/orders tidak mengembalikan data pesanan yang valid.');
  }

  const status = response.data.status;
  if (
    status !== 'PENDING_PAYMENT' &&
    status !== 'PROCESSING' &&
    status !== 'COMPLETED'
  ) {
    throw new Error('/orders mengembalikan status pesanan yang tidak dikenal.');
  }

  if (typeof response.data.createdAt !== 'string') {
    throw new Error('/orders tidak mengembalikan tanggal pesanan.');
  }

  return {
    id: response.data.id,
    status,
    total: response.data.total,
    createdAt: response.data.createdAt,
  };
};

export const getOrders = async (token: string): Promise<OrderHistory[]> => {
  const response = await authenticatedRequest('/orders', token);

  if (!isJsonObject(response) || !Array.isArray(response.data)) {
    throw new Error('/orders tidak mengembalikan daftar pesanan.');
  }

  return response.data.map((entry, index) => {
    if (
      !isJsonObject(entry) ||
      typeof entry.id !== 'string' ||
      (entry.status !== 'PENDING_PAYMENT' &&
        entry.status !== 'PROCESSING' &&
        entry.status !== 'COMPLETED') ||
      (typeof entry.total !== 'string' && typeof entry.total !== 'number') ||
      typeof entry.createdAt !== 'string' ||
      !isJsonObject(entry.buyer) ||
      typeof entry.buyer.id !== 'string' ||
      typeof entry.buyer.name !== 'string' ||
      !isJsonObject(entry.seller) ||
      typeof entry.seller.id !== 'string' ||
      typeof entry.seller.name !== 'string' ||
      !Array.isArray(entry.items)
    ) {
      throw new Error(`/orders mengembalikan data pesanan tidak valid (item ${index + 1}).`);
    }

    const items = entry.items.map((item, itemIndex) => {
      if (
        !isJsonObject(item) ||
        typeof item.id !== 'string' ||
        typeof item.name !== 'string' ||
        (typeof item.unitPrice !== 'string' &&
          typeof item.unitPrice !== 'number') ||
        typeof item.quantity !== 'number' ||
        !isJsonObject(item.product) ||
        typeof item.product.id !== 'string' ||
        typeof item.product.name !== 'string' ||
        (typeof item.product.imageUrl !== 'string' &&
          item.product.imageUrl !== null)
      ) {
        throw new Error(
          `/orders mengembalikan item pesanan tidak valid (${index + 1}.${itemIndex + 1}).`,
        );
      }

      return {
        id: item.id,
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          imageUrl: item.product.imageUrl,
        },
      };
    });

    return {
      id: entry.id,
      status: entry.status,
      total: entry.total,
      createdAt: entry.createdAt,
      buyer: {
        id: entry.buyer.id,
        name: entry.buyer.name,
      },
      seller: {
        id: entry.seller.id,
        name: entry.seller.name,
      },
      items,
    };
  });
};

export const updateOrderStatus = async (
  token: string,
  orderId: string,
  status: 'PROCESSING' | 'COMPLETED',
): Promise<Order> => {
  const response = await authenticatedRequest(
    `/orders/${encodeURIComponent(orderId)}/status`,
    token,
    {
      method: 'PATCH',
      body: {status},
    },
  );

  if (
    !isJsonObject(response) ||
    !isJsonObject(response.data) ||
    response.data.id !== orderId ||
    response.data.status !== status ||
    (typeof response.data.total !== 'string' &&
      typeof response.data.total !== 'number') ||
    typeof response.data.createdAt !== 'string'
  ) {
    throw new Error('/orders tidak mengembalikan status pesanan yang valid.');
  }

  return {
    id: orderId,
    status,
    total: response.data.total,
    createdAt: response.data.createdAt,
  };
};

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  role: User['role'],
): Promise<void> => {
  await request('/auth/register', {
    method: 'POST',
    body: {name, email, password, role},
    allowEmptyResponse: true,
  });
};

export const loginUser = async (
  email: string,
  password: string,
): Promise<LoginResponse> => {
  const response = await postJson('/auth/login', {email, password});

  const result =
    isJsonObject(response) && isJsonObject(response.data)
      ? response.data
      : response;

  if (
    !isJsonObject(result) ||
    typeof result.token !== 'string' ||
    !isJsonObject(result.user)
  ) {
    const receivedFields = isJsonObject(result)
      ? Object.keys(result).join(', ') || '(objek kosong)'
      : result === undefined
        ? '(respons kosong)'
        : `tipe ${typeof result}`;
    throw new Error(
      `/auth/login menerima bentuk respons yang berbeda. Field yang diterima: ${receivedFields}. Aplikasi mengharapkan field token dan user di level teratas.`,
    );
  }

  const user = result.user;

  if (
    typeof user.id !== 'string' ||
    typeof user.name !== 'string' ||
    typeof user.email !== 'string' ||
    (user.role !== 'BUYER' && user.role !== 'SELLER')
  ) {
    throw new Error('/auth/login mengembalikan data pengguna yang tidak valid.');
  }

  return {
    token: result.token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};
