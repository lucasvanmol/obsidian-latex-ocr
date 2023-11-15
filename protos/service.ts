import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { LatexOCRClient as _latexocr_LatexOCRClient, LatexOCRDefinition as _latexocr_LatexOCRDefinition } from './latexocr/LatexOCR';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  latexocr: {
    LatexOCR: SubtypeConstructor<typeof grpc.Client, _latexocr_LatexOCRClient> & { service: _latexocr_LatexOCRDefinition }
    LatexReply: MessageTypeDefinition
    LatexRequest: MessageTypeDefinition
  }
}

