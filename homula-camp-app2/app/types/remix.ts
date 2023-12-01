import type { ActionFunction, TypedResponse } from "@remix-run/node";

type NonPromise<T> = T extends Promise<infer U> ? U : T;

// クライアントとの型不一致対応
export type Data<T extends ActionFunction> = NonPromise<
  ReturnType<T>
> extends TypedResponse<infer U>
  ? U
  : NonPromise<ReturnType<T>> extends TypedResponse<infer U> | undefined
  ? U | undefined
  : NonPromise<ReturnType<T>>;
