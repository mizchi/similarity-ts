use criterion::{black_box, criterion_group, criterion_main, Criterion};
use similarity_core::{
    calculate_tsed_from_code, compute_edit_distance, parse_and_convert_to_tree, APTEDOptions,
    TSEDOptions,
};

const SMALL_CODE_1: &str = r#"
function add(a: number, b: number): number {
    return a + b;
}

function multiply(x: number, y: number): number {
    return x * y;
}
"#;

const SMALL_CODE_2: &str = r#"
function sum(a: number, b: number): number {
    return a + b;
}

function product(x: number, y: number): number {
    return x * y;
}
"#;

const MEDIUM_CODE_1: &str = r#"
export class UserService {
    private users: Map<string, User> = new Map();

    constructor(private database: Database) {}

    async getUser(id: string): Promise<User | null> {
        const cachedUser = this.users.get(id);
        if (cachedUser) {
            return cachedUser;
        }

        const user = await this.database.findUser(id);
        if (user) {
            this.users.set(id, user);
        }
        return user;
    }

    async createUser(data: CreateUserData): Promise<User> {
        const user = {
            id: generateId(),
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        await this.database.saveUser(user);
        this.users.set(user.id, user);
        return user;
    }

    async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
        const user = await this.getUser(id);
        if (!user) {
            return null;
        }

        const updatedUser = {
            ...user,
            ...updates,
            updatedAt: new Date()
        };

        await this.database.saveUser(updatedUser);
        this.users.set(id, updatedUser);
        return updatedUser;
    }

    async deleteUser(id: string): Promise<boolean> {
        const user = await this.getUser(id);
        if (!user) {
            return false;
        }

        await this.database.deleteUser(id);
        this.users.delete(id);
        return true;
    }
}
"#;

const MEDIUM_CODE_2: &str = r#"
export class UserRepository {
    private cache: Map<string, User> = new Map();

    constructor(private db: Database) {}

    async findUser(userId: string): Promise<User | null> {
        const cached = this.cache.get(userId);
        if (cached) {
            return cached;
        }

        const user = await this.db.queryUser(userId);
        if (user) {
            this.cache.set(userId, user);
        }
        return user;
    }

    async insertUser(userData: CreateUserData): Promise<User> {
        const newUser = {
            id: createId(),
            ...userData,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        await this.db.insertUser(newUser);
        this.cache.set(newUser.id, newUser);
        return newUser;
    }

    async modifyUser(userId: string, modifications: Partial<User>): Promise<User | null> {
        const existingUser = await this.findUser(userId);
        if (!existingUser) {
            return null;
        }

        const modifiedUser = {
            ...existingUser,
            ...modifications,
            updatedAt: new Date()
        };

        await this.db.updateUser(modifiedUser);
        this.cache.set(userId, modifiedUser);
        return modifiedUser;
    }

    async removeUser(userId: string): Promise<boolean> {
        const existingUser = await this.findUser(userId);
        if (!existingUser) {
            return false;
        }

        await this.db.removeUser(userId);
        this.cache.delete(userId);
        return true;
    }
}
"#;

#[allow(clippy::needless_raw_string_hashes)]
fn benchmark_tsed_calculation(c: &mut Criterion) {
    let mut group = c.benchmark_group("TSED Calculation");

    group.bench_function("small files (full calculation)", |b| {
        b.iter(|| {
            calculate_tsed_from_code(
                black_box(SMALL_CODE_1),
                black_box(SMALL_CODE_2),
                black_box("small1.ts"),
                black_box("small2.ts"),
                &TSEDOptions::default(),
            )
        });
    });

    group.bench_function("medium files (full calculation)", |b| {
        b.iter(|| {
            calculate_tsed_from_code(
                black_box(MEDIUM_CODE_1),
                black_box(MEDIUM_CODE_2),
                black_box("medium1.ts"),
                black_box("medium2.ts"),
                &TSEDOptions::default(),
            )
        });
    });

    group.finish();
}

fn benchmark_parsing(c: &mut Criterion) {
    let mut group = c.benchmark_group("Parsing");

    group.bench_function("parse small file", |b| {
        b.iter(|| parse_and_convert_to_tree(black_box("small.ts"), black_box(SMALL_CODE_1)));
    });

    group.bench_function("parse medium file", |b| {
        b.iter(|| parse_and_convert_to_tree(black_box("medium.ts"), black_box(MEDIUM_CODE_1)));
    });

    group.finish();
}

fn benchmark_tree_edit_distance(c: &mut Criterion) {
    let mut group = c.benchmark_group("Tree Edit Distance");

    // Pre-parse trees for edit distance benchmark
    let small_tree_1 = parse_and_convert_to_tree("small1.ts", SMALL_CODE_1).unwrap();
    let small_tree_2 = parse_and_convert_to_tree("small2.ts", SMALL_CODE_2).unwrap();
    let medium_tree_1 = parse_and_convert_to_tree("medium1.ts", MEDIUM_CODE_1).unwrap();
    let medium_tree_2 = parse_and_convert_to_tree("medium2.ts", MEDIUM_CODE_2).unwrap();

    group.bench_function("small trees", |b| {
        b.iter(|| {
            compute_edit_distance(
                black_box(&small_tree_1),
                black_box(&small_tree_2),
                &APTEDOptions::default(),
            )
        });
    });

    group.bench_function("medium trees", |b| {
        b.iter(|| {
            compute_edit_distance(
                black_box(&medium_tree_1),
                black_box(&medium_tree_2),
                &APTEDOptions::default(),
            )
        });
    });

    group.finish();
}

fn benchmark_repeated_calculations(c: &mut Criterion) {
    let mut group = c.benchmark_group("Repeated Calculations");

    // Benchmark how well the implementation handles repeated calculations
    // This can help identify if there are any caching opportunities
    group.bench_function("100 small file comparisons", |b| {
        b.iter(|| {
            for _ in 0..100 {
                let _ = calculate_tsed_from_code(
                    black_box(SMALL_CODE_1),
                    black_box(SMALL_CODE_2),
                    black_box("small1.ts"),
                    black_box("small2.ts"),
                    &TSEDOptions::default(),
                )
                .expect("TSED calculation should not fail in benchmark");
            }
        });
    });

    group.finish();
}

criterion_group!(
    benches,
    benchmark_tsed_calculation,
    benchmark_parsing,
    benchmark_tree_edit_distance,
    benchmark_repeated_calculations
);
criterion_main!(benches);
