export type ContactFieldErrors = {
  name?: string;
  email?: string;
  message?: string;
};

export type ContactFormState = {
  status: "idle" | "success" | "error" | "unavailable";
  message: string | null;
  errors: ContactFieldErrors;
};

export const initialContactFormState: ContactFormState = {
  status: "idle",
  message: null,
  errors: {},
};
