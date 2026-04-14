from django import forms


class PinLoginForm(forms.Form):
    """Simple PIN entry form."""
    pin = forms.CharField(
        max_length=6,
        min_length=4,
        widget=forms.PasswordInput(attrs={
            "inputmode": "numeric",
            "pattern": "[0-9]*",
            "autocomplete": "off",
            "class": "pin-input",
            "placeholder": "····",
        }),
    )

    def clean_pin(self):
        pin = self.cleaned_data["pin"]
        if not pin.isdigit():
            raise forms.ValidationError("PIN must be numbers only.")
        return pin
