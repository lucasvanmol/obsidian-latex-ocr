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

class ServerIsReadyReply(_message.Message):
    __slots__ = ["is_ready"]
    IS_READY_FIELD_NUMBER: _ClassVar[int]
    is_ready: bool
    def __init__(self, is_ready: bool = ...) -> None: ...

class ServerConfig(_message.Message):
    __slots__ = ["device", "cache_dir"]
    DEVICE_FIELD_NUMBER: _ClassVar[int]
    CACHE_DIR_FIELD_NUMBER: _ClassVar[int]
    device: str
    cache_dir: str
    def __init__(self, device: _Optional[str] = ..., cache_dir: _Optional[str] = ...) -> None: ...

class Empty(_message.Message):
    __slots__ = []
    def __init__(self) -> None: ...
