import service_pb2_grpc
import service_pb2
import grpc
import torch
from PIL import Image
from transformers import VisionEncoderDecoderModel
from transformers.models.nougat import NougatTokenizerFast
from nougat_latex_ocr.nougat_latex.util import process_raw_latex_code
from nougat_latex_ocr.nougat_latex import NougatLaTexProcessor
import argparse
from concurrent import futures
import logging

def parse_option():
    parser = argparse.ArgumentParser(prog="Latex OCR Server", description="A server that translates paths to images of equations to latex using protocol buffers.")
    parser.add_argument("--port", default="50051")
    parser.add_argument("--cache_dir", default=None, help="path to model cache")
    return parser.parse_args()

class LatexOCR(service_pb2_grpc.LatexOCRServicer):
    def __init__(self, model, cache_dir, device):
        self.device = device

        print("Loading model...", end="", flush=True)
        self.model = VisionEncoderDecoderModel.from_pretrained(model, cache_dir=cache_dir, resume_download=True).to(device)
        print(" done", flush=True)

        print("Loading processor...", end="", flush=True)
        self.tokenizer = NougatTokenizerFast.from_pretrained(model, cache_dir=cache_dir, resume_download=True)
        self.latex_processor = NougatLaTexProcessor.from_pretrained(model, cache_dir=cache_dir, resume_download=True)
        print(" done", flush=True)


    def GenerateLatex(self, request, context):
        image = Image.open(request.image_path)
        if not image.mode == "RGB":
            image = image.convert('RGB')
        result = self.inference(image)
        return service_pb2.LatexReply(latex=result)
    
    def inference(self, image):
        pixel_values = self.latex_processor(image, return_tensors="pt").pixel_values
        task_prompt = self.tokenizer.bos_token
        decoder_input_ids = self.tokenizer(task_prompt, add_special_tokens=False,
                                    return_tensors="pt").input_ids
        with torch.no_grad():
            outputs = self.model.generate(
                pixel_values.to(self.device),
                decoder_input_ids=decoder_input_ids.to(self.device),
                max_length=self.model.decoder.config.max_length,
                pad_token_id=self.tokenizer.pad_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
                use_cache=True,
                bad_words_ids=[[self.tokenizer.unk_token_id]],
                return_dict_in_generate=True,
            )
        sequence = self.tokenizer.batch_decode(outputs.sequences)[0]
        sequence = sequence.replace(self.tokenizer.eos_token, "").replace(self.tokenizer.pad_token, "").replace(self.tokenizer.bos_token,"")
        return process_raw_latex_code(sequence)



def serve(port: str, cache_dir: str):
    if torch.cuda.is_available():
        device = torch.device("cuda:0")
    else:
        device = torch.device("cpu")
    print(f"Starting server on port {port}, using {device}", flush=True)
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    service_pb2_grpc.add_LatexOCRServicer_to_server(LatexOCR("Norm/nougat-latex-base", cache_dir, device), server)
    server.add_insecure_port("[::]:" + port)
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    logging.basicConfig()
    args = parse_option()
    serve(args.port, args.cache_dir)