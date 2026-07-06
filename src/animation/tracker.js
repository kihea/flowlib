export class ValueTracker {
  constructor(value = 0) {
    this.value = value;
  }

  getValue() {
    return this.value;
  }

  setValue(value) {
    this.value = value;
    return this;
  }

  incrementValue(delta) {
    this.value += delta;
    return this;
  }

  valueOf() {
    return this.value;
  }
}
