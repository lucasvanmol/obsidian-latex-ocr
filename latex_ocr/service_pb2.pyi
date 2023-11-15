from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional

DESCRIPTOR: _descriptor.FileDescriptor

class LatexRequest(_message.Message):
    __slots__ = ["image_path"]
    IMAGE_PATH_FIELD_NUMBER: _ClassVar[int]
    image_path: str
    def __init__(self, image_path: _Optional[str] = ...) -> None: ...

class LatexReply(_message.Message):
    __slots__ = ["latex"]
    LATEX_FIELD_NUMBER: _ClassVar[int]
    latex: str
    def __init__(self, latex: _Optional[str] = ...) -> None: ...
