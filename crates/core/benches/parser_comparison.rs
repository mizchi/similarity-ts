use criterion::{black_box, criterion_group, criterion_main, Criterion};
use similarity_ts_core::parser::parse_and_convert_to_tree;
use similarity_ts_core::tree_sitter_parser::TreeSitterParser;

const SMALL_JS: &str = r#"
function greet(name) {
    return `Hello, ${name}!`;
}

const add = (a, b) => a + b;
"#;

const MEDIUM_JS: &str = r#"
class Calculator {
    constructor() {
        this.result = 0;
    }
    
    add(x) {
        this.result += x;
        return this;
    }
    
    subtract(x) {
        this.result -= x;
        return this;
    }
    
    multiply(x) {
        this.result *= x;
        return this;
    }
    
    divide(x) {
        if (x !== 0) {
            this.result /= x;
        }
        return this;
    }
    
    getResult() {
        return this.result;
    }
}

function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

const fibonacci = (n) => {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
};
"#;

const LARGE_TS: &str = r#"
interface User {
    id: number;
    name: string;
    email: string;
    createdAt: Date;
}

interface Product {
    id: number;
    name: string;
    price: number;
    stock: number;
}

type UserWithProducts = User & {
    products: Product[];
};

class UserService {
    private users: Map<number, User> = new Map();
    
    async getUser(id: number): Promise<User | null> {
        return this.users.get(id) || null;
    }
    
    async createUser(user: Omit<User, 'id'>): Promise<User> {
        const id = Math.floor(Math.random() * 10000);
        const newUser = { ...user, id };
        this.users.set(id, newUser);
        return newUser;
    }
    
    async updateUser(id: number, updates: Partial<User>): Promise<User | null> {
        const user = this.users.get(id);
        if (!user) return null;
        
        const updatedUser = { ...user, ...updates };
        this.users.set(id, updatedUser);
        return updatedUser;
    }
}

function processUsers(users: User[]): UserWithProducts[] {
    return users.map(user => ({
        ...user,
        products: []
    }));
}

const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
"#;

fn benchmark_parsers(c: &mut Criterion) {
    let mut group = c.benchmark_group("Parser Comparison");

    // Benchmark oxc_parser
    group.bench_function("oxc: small JS", |b| {
        b.iter(|| {
            let tree = parse_and_convert_to_tree("test.js", black_box(SMALL_JS)).unwrap();
            black_box(tree);
        });
    });

    group.bench_function("oxc: medium JS", |b| {
        b.iter(|| {
            let tree = parse_and_convert_to_tree("test.js", black_box(MEDIUM_JS)).unwrap();
            black_box(tree);
        });
    });

    group.bench_function("oxc: large TS", |b| {
        b.iter(|| {
            let tree = parse_and_convert_to_tree("test.ts", black_box(LARGE_TS)).unwrap();
            black_box(tree);
        });
    });

    // Benchmark tree-sitter
    let mut ts_parser = TreeSitterParser::new().unwrap();

    group.bench_function("tree-sitter: small JS", |b| {
        b.iter(|| {
            let tree = ts_parser.parse(black_box(SMALL_JS), false).unwrap();
            black_box(tree);
        });
    });

    group.bench_function("tree-sitter: medium JS", |b| {
        b.iter(|| {
            let tree = ts_parser.parse(black_box(MEDIUM_JS), false).unwrap();
            black_box(tree);
        });
    });

    group.bench_function("tree-sitter: large TS", |b| {
        b.iter(|| {
            let tree = ts_parser.parse(black_box(LARGE_TS), true).unwrap();
            black_box(tree);
        });
    });

    group.finish();
}

criterion_group!(benches, benchmark_parsers);
criterion_main!(benches);
