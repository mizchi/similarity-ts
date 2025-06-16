// Similar: Class with renamed identifiers
class PersonManager {
  private people: Person[] = [];

  addPerson(person: Person): void {
    this.people.push(person);
  }

  getPerson(identifier: number): Person | undefined {
    return this.people.find(p => p.id === identifier);
  }

  removePerson(identifier: number): boolean {
    const idx = this.people.findIndex(p => p.id === identifier);
    if (idx !== -1) {
      this.people.splice(idx, 1);
      return true;
    }
    return false;
  }
}