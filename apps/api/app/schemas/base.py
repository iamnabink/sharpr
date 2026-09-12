from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """All API JSON is camelCase to match the web client's TypeScript types."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True, extra="ignore")
