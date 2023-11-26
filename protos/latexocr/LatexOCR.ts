// Original file: latex_ocr/protos/latex_ocr.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { Empty as _latexocr_Empty, Empty__Output as _latexocr_Empty__Output } from '../latexocr/Empty';
import type { LatexReply as _latexocr_LatexReply, LatexReply__Output as _latexocr_LatexReply__Output } from '../latexocr/LatexReply';
import type { LatexRequest as _latexocr_LatexRequest, LatexRequest__Output as _latexocr_LatexRequest__Output } from '../latexocr/LatexRequest';
import type { ServerConfig as _latexocr_ServerConfig, ServerConfig__Output as _latexocr_ServerConfig__Output } from '../latexocr/ServerConfig';
import type { ServerIsReadyReply as _latexocr_ServerIsReadyReply, ServerIsReadyReply__Output as _latexocr_ServerIsReadyReply__Output } from '../latexocr/ServerIsReadyReply';

export interface LatexOCRClient extends grpc.Client {
  GenerateLatex(argument: _latexocr_LatexRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_latexocr_LatexReply__Output>): grpc.ClientUnaryCall;
  GenerateLatex(argument: _latexocr_LatexRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_latexocr_LatexReply__Output>): grpc.ClientUnaryCall;
  GenerateLatex(argument: _latexocr_LatexRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_latexocr_LatexReply__Output>): grpc.ClientUnaryCall;
  GenerateLatex(argument: _latexocr_LatexRequest, callback: grpc.requestCallback<_latexocr_LatexReply__Output>): grpc.ClientUnaryCall;
  generateLatex(argument: _latexocr_LatexRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_latexocr_LatexReply__Output>): grpc.ClientUnaryCall;
  generateLatex(argument: _latexocr_LatexRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_latexocr_LatexReply__Output>): grpc.ClientUnaryCall;
  generateLatex(argument: _latexocr_LatexRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_latexocr_LatexReply__Output>): grpc.ClientUnaryCall;
  generateLatex(argument: _latexocr_LatexRequest, callback: grpc.requestCallback<_latexocr_LatexReply__Output>): grpc.ClientUnaryCall;
  
  GetConfig(argument: _latexocr_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_latexocr_ServerConfig__Output>): grpc.ClientUnaryCall;
  GetConfig(argument: _latexocr_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_latexocr_ServerConfig__Output>): grpc.ClientUnaryCall;
  GetConfig(argument: _latexocr_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_latexocr_ServerConfig__Output>): grpc.ClientUnaryCall;
  GetConfig(argument: _latexocr_Empty, callback: grpc.requestCallback<_latexocr_ServerConfig__Output>): grpc.ClientUnaryCall;
  getConfig(argument: _latexocr_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_latexocr_ServerConfig__Output>): grpc.ClientUnaryCall;
  getConfig(argument: _latexocr_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_latexocr_ServerConfig__Output>): grpc.ClientUnaryCall;
  getConfig(argument: _latexocr_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_latexocr_ServerConfig__Output>): grpc.ClientUnaryCall;
  getConfig(argument: _latexocr_Empty, callback: grpc.requestCallback<_latexocr_ServerConfig__Output>): grpc.ClientUnaryCall;
  
  IsReady(argument: _latexocr_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_latexocr_ServerIsReadyReply__Output>): grpc.ClientUnaryCall;
  IsReady(argument: _latexocr_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_latexocr_ServerIsReadyReply__Output>): grpc.ClientUnaryCall;
  IsReady(argument: _latexocr_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_latexocr_ServerIsReadyReply__Output>): grpc.ClientUnaryCall;
  IsReady(argument: _latexocr_Empty, callback: grpc.requestCallback<_latexocr_ServerIsReadyReply__Output>): grpc.ClientUnaryCall;
  isReady(argument: _latexocr_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_latexocr_ServerIsReadyReply__Output>): grpc.ClientUnaryCall;
  isReady(argument: _latexocr_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_latexocr_ServerIsReadyReply__Output>): grpc.ClientUnaryCall;
  isReady(argument: _latexocr_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_latexocr_ServerIsReadyReply__Output>): grpc.ClientUnaryCall;
  isReady(argument: _latexocr_Empty, callback: grpc.requestCallback<_latexocr_ServerIsReadyReply__Output>): grpc.ClientUnaryCall;
  
}

export interface LatexOCRHandlers extends grpc.UntypedServiceImplementation {
  GenerateLatex: grpc.handleUnaryCall<_latexocr_LatexRequest__Output, _latexocr_LatexReply>;
  
  GetConfig: grpc.handleUnaryCall<_latexocr_Empty__Output, _latexocr_ServerConfig>;
  
  IsReady: grpc.handleUnaryCall<_latexocr_Empty__Output, _latexocr_ServerIsReadyReply>;
  
}

export interface LatexOCRDefinition extends grpc.ServiceDefinition {
  GenerateLatex: MethodDefinition<_latexocr_LatexRequest, _latexocr_LatexReply, _latexocr_LatexRequest__Output, _latexocr_LatexReply__Output>
  GetConfig: MethodDefinition<_latexocr_Empty, _latexocr_ServerConfig, _latexocr_Empty__Output, _latexocr_ServerConfig__Output>
  IsReady: MethodDefinition<_latexocr_Empty, _latexocr_ServerIsReadyReply, _latexocr_Empty__Output, _latexocr_ServerIsReadyReply__Output>
}
