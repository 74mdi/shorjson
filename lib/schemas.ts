import { z } from "zod";
import { isButtonStyle } from "./bio-shared";
import { sanitizeNoteHtml, stripNoteHtml } from "./note-html";

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

function normaliseInlineText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseMultilineText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .slice(0, 2000);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function isAvatarValue(value: string): boolean {
  return (
    value.startsWith("data:image/") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
}

export const signUpSchema = z.object({
  username: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .refine((value) => USERNAME_PATTERN.test(value), {
      message:
        "Use 3-20 lowercase letters, numbers, or underscores only.",
    }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200, "Password is too long."),
});

export const signInSchema = z.object({
  username: z.string().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1),
});

export const bioLinkCreateSchema = z.object({
  title: z
    .string()
    .transform(normaliseInlineText)
    .refine((value) => value.length > 0, { message: "Title is required." })
    .refine((value) => value.length <= 60, {
      message: "Title must be 60 characters or less.",
    }),
  url: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, { message: "URL is required." })
    .refine((value) => value.length <= 2048, {
      message: "URL is too long.",
    })
    .refine(isHttpUrl, {
      message: "Enter a valid http:// or https:// URL.",
    }),
  icon: z
    .string()
    .transform(normaliseInlineText)
    .refine((value) => value.length > 0, { message: "Icon is required." })
    .refine((value) => value.length <= 40, {
      message: "Icon is too long.",
    })
    .default("🔗"),
  section: z
    .string()
    .transform(normaliseInlineText)
    .refine((value) => value.length <= 30, {
      message: "Section must be 30 characters or less.",
    })
    .default("main"),
  visible: z.boolean().default(true),
});

export const bioLinkUpdateSchema = z
  .object({
    title: z
      .string()
      .transform(normaliseInlineText)
      .refine((value) => value.length > 0, { message: "Title is required." })
      .refine((value) => value.length <= 60, {
        message: "Title must be 60 characters or less.",
      })
      .optional(),
    url: z
      .string()
      .transform((value) => value.trim())
      .refine((value) => value.length > 0, { message: "URL is required." })
      .refine((value) => value.length <= 2048, {
        message: "URL is too long.",
      })
      .refine(isHttpUrl, {
        message: "Enter a valid http:// or https:// URL.",
      })
      .optional(),
    icon: z
      .string()
      .transform(normaliseInlineText)
      .refine((value) => value.length > 0, { message: "Icon is required." })
      .refine((value) => value.length <= 40, {
        message: "Icon is too long.",
      })
      .optional(),
    section: z
      .string()
      .transform(normaliseInlineText)
      .refine((value) => value.length <= 30, {
        message: "Section must be 30 characters or less.",
      })
      .optional(),
    visible: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const noteCreateSchema = z.object({
  title: z
    .string()
    .max(400, "Title is too long.")
    .transform(normaliseInlineText)
    .refine((value) => value.length <= 100, {
      message: "Title must be 100 characters or less.",
    })
    .default(""),
  content: z
    .string()
    .max(20000, "Note content is too long.")
    .transform(sanitizeNoteHtml)
    .refine((value) => stripNoteHtml(value).length <= 12000, {
      message: "Note content is too long.",
    })
    .default(""),
});

export const noteUpdateSchema = z
  .object({
    title: z
      .string()
      .max(400, "Title is too long.")
      .transform(normaliseInlineText)
      .refine((value) => value.length <= 100, {
        message: "Title must be 100 characters or less.",
      })
      .optional(),
    content: z
      .string()
      .max(20000, "Note content is too long.")
      .transform(sanitizeNoteHtml)
      .refine((value) => stripNoteHtml(value).length <= 12000, {
        message: "Note content is too long.",
      })
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type BioLinkCreateInput = z.infer<typeof bioLinkCreateSchema>;
export type BioLinkUpdateInput = z.infer<typeof bioLinkUpdateSchema>;
export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;

export const bioProfileSchema = z.object({
  displayName: z
    .string()
    .transform(normaliseInlineText)
    .refine((value) => value.length <= 60, {
      message: "Display name must be 60 characters or less.",
    }),
  username: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .refine((value) => USERNAME_PATTERN.test(value), {
      message: "Use 3-20 lowercase letters, numbers, or underscores only.",
    }),
  bio: z
    .string()
    .transform((value) => value.normalize("NFKC").replace(/\u0000/g, "").trim())
    .refine((value) => value.length <= 160, {
      message: "Bio must be 160 characters or less.",
    }),
  avatar: z
    .union([
      z
        .string()
        .refine((value) => value.length <= 250000, {
          message: "Avatar is too large.",
        })
        .refine(isAvatarValue, {
          message: "Avatar must be an image data URL or URL.",
        }),
      z.null(),
    ])
    .optional(),
});

export const bioStyleSchema = z.object({
  buttonStyle: z
    .string()
    .refine((value) => isButtonStyle(value), {
      message: "Invalid button style.",
    })
    .transform((value) => value),
  accentColor: z
    .string()
    .refine(isHexColor, {
      message: "Use a valid 6-digit hex color.",
    })
    .transform((value) => value.toLowerCase()),
});
