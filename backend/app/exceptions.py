class AppError(Exception):
    def __init__(self, detail: str, status_code: int = 400) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class ValidationError(AppError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail=detail, status_code=422)


class IntegrationError(AppError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail=detail, status_code=503)
