export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" was not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(entity: string, identifier: string) {
    super(`${entity} with identifier "${identifier}" already exists`);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
