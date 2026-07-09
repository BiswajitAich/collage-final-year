from __future__ import annotations

# import os
# import sys
from app.agent.server import server

# SCRIPT_DIR = os.path.dirname(__file__)
# PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
# if PROJECT_ROOT not in sys.path:
#     sys.path.insert(0, PROJECT_ROOT)


if __name__ == "__main__":
    from livekit.agents import cli

    cli.run_app(server)
