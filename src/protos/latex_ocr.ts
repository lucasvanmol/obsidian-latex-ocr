/* eslint-disable */
import { ChannelCredentials, Client, makeGenericClientConstructor, Metadata } from "@grpc/grpc-js";
import type {
  CallOptions,
  ClientOptions,
  ClientUnaryCall,
  handleUnaryCall,
  ServiceError,
  UntypedServiceImplementation,
} from "@grpc/grpc-js";
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "latexocr";

/** The filepath for an image */
export interface LatexRequest {
  imagePath: string;
}

/** The latex code returned by the model */
export interface LatexReply {
  latex: string;
}

/** Whether the server is ready to process requests */
export interface ServerIsReadyReply {
  isReady: boolean;
}

/** Server Configuration */
export interface ServerConfig {
  device: string;
  cacheDir: string;
}

export interface Empty {
}

function createBaseLatexRequest(): LatexRequest {
  return { imagePath: "" };
}

export const LatexRequest = {
  encode(message: LatexRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.imagePath !== "") {
      writer.uint32(10).string(message.imagePath);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): LatexRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLatexRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.imagePath = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): LatexRequest {
    return { imagePath: isSet(object.imagePath) ? globalThis.String(object.imagePath) : "" };
  },

  toJSON(message: LatexRequest): unknown {
    const obj: any = {};
    if (message.imagePath !== "") {
      obj.imagePath = message.imagePath;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<LatexRequest>, I>>(base?: I): LatexRequest {
    return LatexRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<LatexRequest>, I>>(object: I): LatexRequest {
    const message = createBaseLatexRequest();
    message.imagePath = object.imagePath ?? "";
    return message;
  },
};

function createBaseLatexReply(): LatexReply {
  return { latex: "" };
}

export const LatexReply = {
  encode(message: LatexReply, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.latex !== "") {
      writer.uint32(10).string(message.latex);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): LatexReply {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLatexReply();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.latex = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): LatexReply {
    return { latex: isSet(object.latex) ? globalThis.String(object.latex) : "" };
  },

  toJSON(message: LatexReply): unknown {
    const obj: any = {};
    if (message.latex !== "") {
      obj.latex = message.latex;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<LatexReply>, I>>(base?: I): LatexReply {
    return LatexReply.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<LatexReply>, I>>(object: I): LatexReply {
    const message = createBaseLatexReply();
    message.latex = object.latex ?? "";
    return message;
  },
};

function createBaseServerIsReadyReply(): ServerIsReadyReply {
  return { isReady: false };
}

export const ServerIsReadyReply = {
  encode(message: ServerIsReadyReply, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.isReady === true) {
      writer.uint32(8).bool(message.isReady);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ServerIsReadyReply {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseServerIsReadyReply();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.isReady = reader.bool();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ServerIsReadyReply {
    return { isReady: isSet(object.isReady) ? globalThis.Boolean(object.isReady) : false };
  },

  toJSON(message: ServerIsReadyReply): unknown {
    const obj: any = {};
    if (message.isReady === true) {
      obj.isReady = message.isReady;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ServerIsReadyReply>, I>>(base?: I): ServerIsReadyReply {
    return ServerIsReadyReply.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ServerIsReadyReply>, I>>(object: I): ServerIsReadyReply {
    const message = createBaseServerIsReadyReply();
    message.isReady = object.isReady ?? false;
    return message;
  },
};

function createBaseServerConfig(): ServerConfig {
  return { device: "", cacheDir: "" };
}

export const ServerConfig = {
  encode(message: ServerConfig, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.device !== "") {
      writer.uint32(10).string(message.device);
    }
    if (message.cacheDir !== "") {
      writer.uint32(18).string(message.cacheDir);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ServerConfig {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseServerConfig();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.device = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.cacheDir = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ServerConfig {
    return {
      device: isSet(object.device) ? globalThis.String(object.device) : "",
      cacheDir: isSet(object.cacheDir) ? globalThis.String(object.cacheDir) : "",
    };
  },

  toJSON(message: ServerConfig): unknown {
    const obj: any = {};
    if (message.device !== "") {
      obj.device = message.device;
    }
    if (message.cacheDir !== "") {
      obj.cacheDir = message.cacheDir;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ServerConfig>, I>>(base?: I): ServerConfig {
    return ServerConfig.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ServerConfig>, I>>(object: I): ServerConfig {
    const message = createBaseServerConfig();
    message.device = object.device ?? "";
    message.cacheDir = object.cacheDir ?? "";
    return message;
  },
};

function createBaseEmpty(): Empty {
  return {};
}

export const Empty = {
  encode(_: Empty, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Empty {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEmpty();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(_: any): Empty {
    return {};
  },

  toJSON(_: Empty): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<Empty>, I>>(base?: I): Empty {
    return Empty.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Empty>, I>>(_: I): Empty {
    const message = createBaseEmpty();
    return message;
  },
};

/** Interface exported by the server */
export type LatexOCRService = typeof LatexOCRService;
export const LatexOCRService = {
  /** Generate the latex code for a given image filepath */
  generateLatex: {
    path: "/latexocr.LatexOCR/GenerateLatex",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: LatexRequest) => Buffer.from(LatexRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => LatexRequest.decode(value),
    responseSerialize: (value: LatexReply) => Buffer.from(LatexReply.encode(value).finish()),
    responseDeserialize: (value: Buffer) => LatexReply.decode(value),
  },
  /** Check if the server is ready to return requests */
  isReady: {
    path: "/latexocr.LatexOCR/IsReady",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: Empty) => Buffer.from(Empty.encode(value).finish()),
    requestDeserialize: (value: Buffer) => Empty.decode(value),
    responseSerialize: (value: ServerIsReadyReply) => Buffer.from(ServerIsReadyReply.encode(value).finish()),
    responseDeserialize: (value: Buffer) => ServerIsReadyReply.decode(value),
  },
  /** Get the server config */
  getConfig: {
    path: "/latexocr.LatexOCR/GetConfig",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: Empty) => Buffer.from(Empty.encode(value).finish()),
    requestDeserialize: (value: Buffer) => Empty.decode(value),
    responseSerialize: (value: ServerConfig) => Buffer.from(ServerConfig.encode(value).finish()),
    responseDeserialize: (value: Buffer) => ServerConfig.decode(value),
  },
} as const;

export interface LatexOCRServer extends UntypedServiceImplementation {
  /** Generate the latex code for a given image filepath */
  generateLatex: handleUnaryCall<LatexRequest, LatexReply>;
  /** Check if the server is ready to return requests */
  isReady: handleUnaryCall<Empty, ServerIsReadyReply>;
  /** Get the server config */
  getConfig: handleUnaryCall<Empty, ServerConfig>;
}

export interface LatexOCRClient extends Client {
  /** Generate the latex code for a given image filepath */
  generateLatex(
    request: LatexRequest,
    callback: (error: ServiceError | null, response: LatexReply) => void,
  ): ClientUnaryCall;
  generateLatex(
    request: LatexRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: LatexReply) => void,
  ): ClientUnaryCall;
  generateLatex(
    request: LatexRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: LatexReply) => void,
  ): ClientUnaryCall;
  /** Check if the server is ready to return requests */
  isReady(
    request: Empty,
    callback: (error: ServiceError | null, response: ServerIsReadyReply) => void,
  ): ClientUnaryCall;
  isReady(
    request: Empty,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: ServerIsReadyReply) => void,
  ): ClientUnaryCall;
  isReady(
    request: Empty,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: ServerIsReadyReply) => void,
  ): ClientUnaryCall;
  /** Get the server config */
  getConfig(request: Empty, callback: (error: ServiceError | null, response: ServerConfig) => void): ClientUnaryCall;
  getConfig(
    request: Empty,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: ServerConfig) => void,
  ): ClientUnaryCall;
  getConfig(
    request: Empty,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: ServerConfig) => void,
  ): ClientUnaryCall;
}

export const LatexOCRClient = makeGenericClientConstructor(LatexOCRService, "latexocr.LatexOCR") as unknown as {
  new (address: string, credentials: ChannelCredentials, options?: Partial<ClientOptions>): LatexOCRClient;
  service: typeof LatexOCRService;
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
