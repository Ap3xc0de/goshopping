export class GoShoppingError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code: string = 'UNKNOWN') {
    super(message);
    this.name = 'GoShoppingError';
    this.status = status;
    this.code = code;
    // Restore prototype chain (TypeScript + ES5 target quirk)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NetworkError extends GoShoppingError {
  constructor(message: string = 'Error de conexión') {
    super(0, message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends GoShoppingError {
  constructor(message: string = 'No encontrado') {
    super(404, message, 'NOT_FOUND');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class StockError extends GoShoppingError {
  productId: string;
  available: number;
  requested: number;

  constructor(productId: string, available: number, requested: number) {
    super(
      409,
      `Stock insuficiente para el producto ${productId}: disponible ${available}, solicitado ${requested}`,
      'INSUFFICIENT_STOCK',
    );
    this.name = 'StockError';
    this.productId = productId;
    this.available = available;
    this.requested = requested;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends GoShoppingError {
  fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    super(422, 'Error de validación', 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.fields = fields;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
