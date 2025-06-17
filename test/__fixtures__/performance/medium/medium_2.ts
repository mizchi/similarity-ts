// Medium test file 2

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError } from 'rxjs';

export interface Entity0 {
  id: string;
  name: string;
  description?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Entity1 {
  id: string;
  name: string;
  description?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Entity2 {
  id: string;
  name: string;
  description?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Entity3 {
  id: string;
  name: string;
  description?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Entity4 {
  id: string;
  name: string;
  description?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DataService2 {
  private baseUrl = '/api/v1';

  constructor(private http: HttpClient) {}

  // User methods
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`)
      .pipe(
        map(data => data.map(this.transformUser)),
        catchError(this.handleError)
      );
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/users/${id}`)
      .pipe(
        map(this.transformUser),
        catchError(this.handleError)
      );
  }

  createUser(data: Partial<User>): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/users`, data)
      .pipe(
        map(this.transformUser),
        catchError(this.handleError)
      );
  }

  private transformUser(data: any): User {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }

  // Product methods
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/products`)
      .pipe(
        map(data => data.map(this.transformProduct)),
        catchError(this.handleError)
      );
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/products/${id}`)
      .pipe(
        map(this.transformProduct),
        catchError(this.handleError)
      );
  }

  createProduct(data: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.baseUrl}/products`, data)
      .pipe(
        map(this.transformProduct),
        catchError(this.handleError)
      );
  }

  private transformProduct(data: any): Product {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }

  // Order methods
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders`)
      .pipe(
        map(data => data.map(this.transformOrder)),
        catchError(this.handleError)
      );
  }

  getOrder(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/orders/${id}`)
      .pipe(
        map(this.transformOrder),
        catchError(this.handleError)
      );
  }

  createOrder(data: Partial<Order>): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/orders`, data)
      .pipe(
        map(this.transformOrder),
        catchError(this.handleError)
      );
  }

  private transformOrder(data: any): Order {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }

  // Category methods
  getCategorys(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/categorys`)
      .pipe(
        map(data => data.map(this.transformCategory)),
        catchError(this.handleError)
      );
  }

  getCategory(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.baseUrl}/categorys/${id}`)
      .pipe(
        map(this.transformCategory),
        catchError(this.handleError)
      );
  }

  createCategory(data: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(`${this.baseUrl}/categorys`, data)
      .pipe(
        map(this.transformCategory),
        catchError(this.handleError)
      );
  }

  private transformCategory(data: any): Category {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }

  // Review methods
  getReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.baseUrl}/reviews`)
      .pipe(
        map(data => data.map(this.transformReview)),
        catchError(this.handleError)
      );
  }

  getReview(id: string): Observable<Review> {
    return this.http.get<Review>(`${this.baseUrl}/reviews/${id}`)
      .pipe(
        map(this.transformReview),
        catchError(this.handleError)
      );
  }

  createReview(data: Partial<Review>): Observable<Review> {
    return this.http.post<Review>(`${this.baseUrl}/reviews`, data)
      .pipe(
        map(this.transformReview),
        catchError(this.handleError)
      );
  }

  private transformReview(data: any): Review {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    throw error;
  }
}
