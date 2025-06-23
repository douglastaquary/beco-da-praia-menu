import { Product } from "../common/product";

export class GroupedCategory {
  constructor(
    public id: number,
    public category: string,
    public description: string,
    public products: Product[]
  ) {}
}