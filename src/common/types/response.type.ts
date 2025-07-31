export type StandardError = { message: string; code: string };

export type Failure<TError> = {
  status: 'failure';
  isSuccess: false;
  error: TError | StandardError;
};

export type Success<TData> = {
  status: 'success';
  isSuccess: true;
  data: TData;
};

export type Result<TData, TError> = Success<TData> | Failure<TError>;

export const success = <T>(data: T): Success<T> => ({
  status: 'success',
  isSuccess: true,
  data: data,
});

export const failure = <E>(error: E): Failure<E> => ({
  status: 'failure',
  isSuccess: false,
  error: error,
});
