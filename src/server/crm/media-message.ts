const allowedMediaTypes = ["image", "video", "audio", "document"] as const;

type MediaType = (typeof allowedMediaTypes)[number];

type MediaClient = {
  sendMediaMessage(input: {
    number: string;
    mediatype: MediaType;
    media: Blob;
    caption?: string;
    fileName?: string;
  }): Promise<unknown>;
};

type SendValidatedMediaMessageInput = {
  number: string;
  mediatype: string;
  media: Blob;
  caption?: string;
  fileName?: string;
};

function isMediaType(value: string): value is MediaType {
  return allowedMediaTypes.includes(value as MediaType);
}

export async function sendValidatedMediaMessage(
  client: MediaClient,
  input: SendValidatedMediaMessageInput,
) {
  if (!isMediaType(input.mediatype))
    throw new Error(`Unsupported media type: ${input.mediatype}`);
  if (input.mediatype === "document" && !input.fileName?.trim())
    throw new Error("Document media requires fileName");

  return client.sendMediaMessage({
    number: input.number,
    mediatype: input.mediatype,
    media: input.media,
    caption: input.caption,
    fileName: input.fileName,
  });
}
