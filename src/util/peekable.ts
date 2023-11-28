export class Peekable<T> implements Iterator<T, void> {
  peek: IteratorResult<T, void>;
  constructor(private iterator: Iterator<T, void>) {
    this.peek = iterator.next();
  }
  next() {
    const curr = this.peek;
    this.peek = this.iterator.next();
    return curr;
  }
  [Symbol.iterator]() {
    return this;
  }
}
