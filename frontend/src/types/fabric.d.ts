declare module "fabric" {
  export namespace fabric {
    interface IObjectOptions {
      id?: string;
      left?: number;
      top?: number;
      width?: number;
      height?: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      strokeLineCap?: string;
      selectable?: boolean;
      evented?: boolean;
      opacity?: number;
      scaleX?: number;
      scaleY?: number;
      fontSize?: number;
      fontFamily?: string;
      backgroundColor?: string;
      padding?: number;
      editable?: boolean;
      [key: string]: unknown;
    }
    class Object {
      id?: string;
      type?: string;
      left?: number;
      top?: number;
      width?: number;
      height?: number;
      scaleX?: number;
      scaleY?: number;
      selectable?: boolean;
      evented?: boolean;
      x1?: number;
      y1?: number;
      x2?: number;
      y2?: number;
      set(options: Partial<IObjectOptions> | Record<string, unknown>): this;
      toObject(propertiesToInclude?: string[]): Record<string, unknown>;
    }
    class IText extends Object {
      constructor(text: string, options?: IObjectOptions);
      enterEditing(): void;
      selectAll(): void;
    }
    class Rect extends Object {
      constructor(options?: IObjectOptions);
    }
    class Line extends Object {
      constructor(
        points: [number, number, number, number],
        options?: IObjectOptions,
      );
    }
    interface Point {
      x: number;
      y: number;
    }
    interface FabricEvent {
      e: MouseEvent | TouchEvent;
      target?: Object;
      path?: Object & { id?: string };
    }
    interface FreeDrawingBrush {
      color: string;
      width: number;
    }
    interface CanvasOptions {
      width?: number;
      height?: number;
      selection?: boolean;
      renderOnAddRemove?: boolean;
      preserveObjectStacking?: boolean;
    }
    class Canvas {
      constructor(element: HTMLCanvasElement | string, options?: CanvasOptions);
      selectionColor: string;
      selectionBorderColor: string;
      selectionLineWidth: number;
      isDrawingMode: boolean;
      selection: boolean;
      defaultCursor: string;
      freeDrawingBrush: FreeDrawingBrush;
      add(...objects: Object[]): this;
      remove(...objects: Object[]): this;
      renderAll(): this;
      clear(): this;
      dispose(): void;
      getObjects(): Object[];
      getActiveObject(): Object | null;
      setActiveObject(object: Object): this;
      getPointer(e: Event): Point;
      loadFromJSON(
        json: string | Record<string, unknown>,
        callback: () => void,
      ): this;
      toJSON(propertiesToInclude?: string[]): Record<string, unknown>;
      on(event: string, handler: (opt: FabricEvent) => void): this;
      off(event: string): this;
    }
  }
  export const fabric: {
    Object: typeof fabric.Object;
    Canvas: typeof fabric.Canvas;
    IText: typeof fabric.IText;
    Rect: typeof fabric.Rect;
    Line: typeof fabric.Line;
  };
  export default fabric;
}
