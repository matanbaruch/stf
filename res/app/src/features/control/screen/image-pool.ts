export class ImagePool {
  private images: HTMLImageElement[] = []
  private counter = 0

  constructor(private readonly size: number) {}

  next(): HTMLImageElement {
    if (this.images.length < this.size) {
      const image = new Image()
      this.images.push(image)
      return image
    }
    if (this.counter >= this.size) {
      this.counter = 0
    }
    return this.images[this.counter++ % this.size]
  }
}
