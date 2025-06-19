export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string = "Unauthorized") {
    super(message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}
