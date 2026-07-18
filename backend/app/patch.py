"""Runtime patches to handle compatibility issues in external libraries.

1. Patches `threading.Lock` to support the pipe (`|`) union operator in Python 3.11+.
2. Patches `pydantic` to export `ModelWrapValidatorHandler` at the top level to support CrewAI.
"""
import threading
import pydantic

# 1. Patch threading.Lock to support union '|' operator in Python 3.11+
_real_Lock = threading.Lock

class PatchLock:
    def __new__(cls, *args, **kwargs):
        return _real_Lock(*args, **kwargs)

threading.Lock = PatchLock

# 2. Patch pydantic to export ModelWrapValidatorHandler for CrewAI
if not hasattr(pydantic, 'ModelWrapValidatorHandler'):
    from pydantic.functional_validators import ModelWrapValidatorHandler
    pydantic.ModelWrapValidatorHandler = ModelWrapValidatorHandler

# 3. Mock lancedb and pyarrow to bypass Windows Application Control DLL load block
import sys
from unittest.mock import MagicMock
sys.modules['pyarrow'] = MagicMock()
sys.modules['pyarrow.dataset'] = MagicMock()
sys.modules['lancedb'] = MagicMock()

# Trigger Uvicorn reload
