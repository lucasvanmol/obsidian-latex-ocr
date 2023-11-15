# Generated by the gRPC Python protocol compiler plugin. DO NOT EDIT!
"""Client and server classes corresponding to protobuf-defined services."""
import grpc

import service_pb2 as service__pb2


class LatexOCRStub(object):
    """Interface exported by the server
    """

    def __init__(self, channel):
        """Constructor.

        Args:
            channel: A grpc.Channel.
        """
        self.GenerateLatex = channel.unary_unary(
                '/latexocr.LatexOCR/GenerateLatex',
                request_serializer=service__pb2.LatexRequest.SerializeToString,
                response_deserializer=service__pb2.LatexReply.FromString,
                )


class LatexOCRServicer(object):
    """Interface exported by the server
    """

    def GenerateLatex(self, request, context):
        """Generate the latex code for a given image filepath
        """
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details('Method not implemented!')
        raise NotImplementedError('Method not implemented!')


def add_LatexOCRServicer_to_server(servicer, server):
    rpc_method_handlers = {
            'GenerateLatex': grpc.unary_unary_rpc_method_handler(
                    servicer.GenerateLatex,
                    request_deserializer=service__pb2.LatexRequest.FromString,
                    response_serializer=service__pb2.LatexReply.SerializeToString,
            ),
    }
    generic_handler = grpc.method_handlers_generic_handler(
            'latexocr.LatexOCR', rpc_method_handlers)
    server.add_generic_rpc_handlers((generic_handler,))


 # This class is part of an EXPERIMENTAL API.
class LatexOCR(object):
    """Interface exported by the server
    """

    @staticmethod
    def GenerateLatex(request,
            target,
            options=(),
            channel_credentials=None,
            call_credentials=None,
            insecure=False,
            compression=None,
            wait_for_ready=None,
            timeout=None,
            metadata=None):
        return grpc.experimental.unary_unary(request, target, '/latexocr.LatexOCR/GenerateLatex',
            service__pb2.LatexRequest.SerializeToString,
            service__pb2.LatexReply.FromString,
            options, channel_credentials,
            insecure, call_credentials, compression, wait_for_ready, timeout, metadata)
