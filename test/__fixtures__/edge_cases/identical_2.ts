// Edge case: Identical complex code
export class ComplexService<T extends BaseEntity> {
  private readonly repository: Repository<T>;
  private readonly cache: Map<string, T> = new Map();

  constructor(repository: Repository<T>) {
    this.repository = repository;
  }

  async findById(id: string): Promise<T | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const entity = await this.repository.findOne({ where: { id } });
    if (entity) {
      this.cache.set(id, entity);
    }
    return entity;
  }

  async save(entity: T): Promise<T> {
    const saved = await this.repository.save(entity);
    this.cache.set(saved.id, saved);
    return saved;
  }
}