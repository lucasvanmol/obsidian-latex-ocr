// Original file: protos/service.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { LatexReply as _latexocr_LatexReply, LatexReply__Output as _latexocr_LatexReply__Output } from '../latexocr/LatexReply';
import type { LatexRequest as _latexocr_LatexRequest, LatexRequest__Output as _latexocr_LatexRequest__Output } from '../latexocr/LatexRequest';

export interface LatexOCRClient extends grpc.Client {
  GenerateLatex(argument: _latexocr_LatexRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_latexocr_LatexReply__Output>): grpc.ClientUnaryCall;
  GenerateLatex(argument: _latexocr_LatexRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_latexocr_LatexReply__Output>): grpc.ClientUnaryCall;
  GenerateLatex(argument: _latexocr_LatexRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_latexocr_LatexReply__Output>): grpc.ClientUnaryCall;
  GenerateLatex(argument: _latexocr_LatexRequest, callback: grpc.requestCallback<_latexocr_LatexReply__Output>): grpc.ClientUnaryCall;
  generateLatex(argument: _latexocr_LatexRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_latexocr_LatexReply__Output>): grpc.ClientUnaryCall;
  generateLatex(argument: _latexocr_LatexRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_latexocr_LatexReply__Output>): grpc.ClientUnaryCall;
  generateLatex(argument: _latexocr_LatexRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_latexocr_LatexReply__Output>): grpc.ClientUnaryCall;
  generateLatex(argument: _latexocr_LatexRequest, callback: grpc.requestCallback<_latexocr_LatexReply__Output>): grpc.ClientUnaryCall;
  
}

export interface LatexOCRHandlers extends grpc.UntypedServiceImplementation {
  GenerateLatex: grpc.handleUnaryCall<_latexocr_LatexRequest__Output, _latexocr_LatexReply>;
  
}

export interface LatexOCRDefinition extends grpc.ServiceDefinition {
  GenerateLatex: MethodDefinition<_latexocr_LatexRequest, _latexocr_LatexReply, _latexocr_LatexRequest__Output, _latexocr_LatexReply__Output>
}
