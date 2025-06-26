use criterion::{black_box, criterion_group, criterion_main, Criterion};
use similarity_core::{
    find_similar_functions_across_files, find_similar_functions_across_files_fast,
    find_similar_functions_fast, find_similar_functions_in_file, FastSimilarityOptions,
    TSEDOptions,
};

const SMALL_FILE: &str = r#"
export function add(a: number, b: number): number {
    return a + b;
}

export function subtract(x: number, y: number): number {
    return x - y;
}

export function multiply(m: number, n: number): number {
    return m * n;
}

export function sum(first: number, second: number): number {
    return first + second;
}
"#;

const MEDIUM_FILE: &str = r#"
export class Calculator {
    add(a: number, b: number): number {
        return a + b;
    }

    subtract(a: number, b: number): number {
        return a - b;
    }

    multiply(a: number, b: number): number {
        return a * b;
    }

    divide(a: number, b: number): number {
        if (b === 0) throw new Error("Division by zero");
        return a / b;
    }
}

export function processArray(arr: number[]): number {
    let result = 0;
    for (let i = 0; i < arr.length; i++) {
        result += arr[i];
    }
    return result;
}

export function handleList(list: number[]): number {
    let sum = 0;
    for (const item of list) {
        sum += item;
    }
    return sum;
}

export const computeTotal = (values: number[]): number => {
    return values.reduce((acc, val) => acc + val, 0);
};

export const calculateSum = (numbers: number[]): number => {
    let total = 0;
    numbers.forEach(num => total += num);
    return total;
};
"#;

const LARGE_FILE: &str = r#"
export class UserService {
    private users: Map<string, User> = new Map();

    async getUser(id: string): Promise<User | null> {
        const cachedUser = this.users.get(id);
        if (cachedUser) return cachedUser;
        const user = await this.database.findUser(id);
        if (user) this.users.set(id, user);
        return user;
    }

    async createUser(data: CreateUserData): Promise<User> {
        const user = { id: generateId(), ...data, createdAt: new Date() };
        await this.database.saveUser(user);
        this.users.set(user.id, user);
        return user;
    }

    async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
        const user = await this.getUser(id);
        if (!user) return null;
        const updatedUser = { ...user, ...updates, updatedAt: new Date() };
        await this.database.saveUser(updatedUser);
        this.users.set(id, updatedUser);
        return updatedUser;
    }

    async deleteUser(id: string): Promise<boolean> {
        const user = await this.getUser(id);
        if (!user) return false;
        await this.database.deleteUser(id);
        this.users.delete(id);
        return true;
    }

    async findUserByEmail(email: string): Promise<User | null> {
        for (const user of this.users.values()) {
            if (user.email === email) return user;
        }
        return await this.database.findUserByEmail(email);
    }

    async listUsers(limit: number = 100): Promise<User[]> {
        const users = Array.from(this.users.values());
        if (users.length >= limit) return users.slice(0, limit);
        const dbUsers = await this.database.listUsers(limit);
        return [...users, ...dbUsers].slice(0, limit);
    }
}

function processItems(items: Item[]): ProcessedItem[] {
    const processed: ProcessedItem[] = [];
    for (const item of items) {
        if (item.isValid()) {
            processed.push({
                id: item.id,
                name: item.name,
                value: item.getValue(),
                timestamp: Date.now()
            });
        }
    }
    return processed;
}

function handleElements(elements: Item[]): ProcessedItem[] {
    const results: ProcessedItem[] = [];
    elements.forEach(element => {
        if (element.isValid()) {
            results.push({
                id: element.id,
                name: element.name,
                value: element.getValue(),
                timestamp: Date.now()
            });
        }
    });
    return results;
}

const transformData = (data: Item[]): ProcessedItem[] => {
    return data
        .filter(d => d.isValid())
        .map(d => ({
            id: d.id,
            name: d.name,
            value: d.getValue(),
            timestamp: Date.now()
        }));
};
"#;

fn benchmark_function_similarity_within_file(c: &mut Criterion) {
    let mut group = c.benchmark_group("Function Similarity Within File");
    let options = TSEDOptions::default();

    group.bench_function("small file (4 functions)", |b| {
        b.iter(|| {
            find_similar_functions_in_file(
                black_box("small.ts"),
                black_box(SMALL_FILE),
                black_box(0.7),
                black_box(&options),
            )
        });
    });

    group.bench_function("medium file (8 functions)", |b| {
        b.iter(|| {
            find_similar_functions_in_file(
                black_box("medium.ts"),
                black_box(MEDIUM_FILE),
                black_box(0.7),
                black_box(&options),
            )
        });
    });

    group.bench_function("large file (9 functions)", |b| {
        b.iter(|| {
            find_similar_functions_in_file(
                black_box("large.ts"),
                black_box(LARGE_FILE),
                black_box(0.7),
                black_box(&options),
            )
        });
    });

    group.finish();
}

fn benchmark_function_similarity_across_files(c: &mut Criterion) {
    let mut group = c.benchmark_group("Function Similarity Across Files");
    let options = TSEDOptions::default();

    let files_small = vec![
        ("file1.ts".to_string(), SMALL_FILE.to_string()),
        ("file2.ts".to_string(), SMALL_FILE.to_string()),
    ];

    let files_medium = vec![
        ("file1.ts".to_string(), MEDIUM_FILE.to_string()),
        ("file2.ts".to_string(), MEDIUM_FILE.to_string()),
        ("file3.ts".to_string(), SMALL_FILE.to_string()),
    ];

    let files_large = vec![
        ("file1.ts".to_string(), LARGE_FILE.to_string()),
        ("file2.ts".to_string(), LARGE_FILE.to_string()),
        ("file3.ts".to_string(), MEDIUM_FILE.to_string()),
        ("file4.ts".to_string(), SMALL_FILE.to_string()),
    ];

    group.bench_function("2 small files", |b| {
        b.iter(|| {
            find_similar_functions_across_files(
                black_box(&files_small),
                black_box(0.7),
                black_box(&options),
            )
        });
    });

    group.bench_function("3 mixed files", |b| {
        b.iter(|| {
            find_similar_functions_across_files(
                black_box(&files_medium),
                black_box(0.7),
                black_box(&options),
            )
        });
    });

    group.bench_function("4 mixed files (worst case)", |b| {
        b.iter(|| {
            find_similar_functions_across_files(
                black_box(&files_large),
                black_box(0.7),
                black_box(&options),
            )
        });
    });

    group.finish();
}

fn benchmark_fast_comparison(c: &mut Criterion) {
    let mut group = c.benchmark_group("Fast Function Comparison");
    let fast_options = FastSimilarityOptions {
        fingerprint_threshold: 0.5,
        similarity_threshold: 0.7,
        tsed_options: TSEDOptions::default(),
        debug_stats: false,
    };

    group.bench_function("fast: small file", |b| {
        b.iter(|| {
            find_similar_functions_fast(
                black_box("small.ts"),
                black_box(SMALL_FILE),
                black_box(&fast_options),
            )
        });
    });

    group.bench_function("fast: medium file", |b| {
        b.iter(|| {
            find_similar_functions_fast(
                black_box("medium.ts"),
                black_box(MEDIUM_FILE),
                black_box(&fast_options),
            )
        });
    });

    group.bench_function("fast: large file", |b| {
        b.iter(|| {
            find_similar_functions_fast(
                black_box("large.ts"),
                black_box(LARGE_FILE),
                black_box(&fast_options),
            )
        });
    });

    let files_medium = vec![
        ("file1.ts".to_string(), MEDIUM_FILE.to_string()),
        ("file2.ts".to_string(), MEDIUM_FILE.to_string()),
        ("file3.ts".to_string(), SMALL_FILE.to_string()),
    ];

    group.bench_function("fast: 3 mixed files cross-file", |b| {
        b.iter(|| {
            find_similar_functions_across_files_fast(
                black_box(&files_medium),
                black_box(&fast_options),
            )
        });
    });

    group.finish();
}

criterion_group!(
    benches,
    benchmark_function_similarity_within_file,
    benchmark_function_similarity_across_files,
    benchmark_fast_comparison
);
criterion_main!(benches);
