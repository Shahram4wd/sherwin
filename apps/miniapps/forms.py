from django import forms

from .models import MiniApp, MiniAppTag


class MiniAppTagForm(forms.ModelForm):
    class Meta:
        model = MiniAppTag
        fields = ["name", "slug"]
        widgets = {
            "name": forms.TextInput(
                attrs={
                    "class": "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white",
                    "placeholder": "Tag name",
                }
            ),
            "slug": forms.TextInput(
                attrs={
                    "class": "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white",
                    "placeholder": "tag-slug (optional)",
                }
            ),
        }


class MiniAppTagAssignmentForm(forms.ModelForm):
    tags = forms.ModelMultipleChoiceField(
        queryset=MiniAppTag.objects.none(),
        required=False,
        widget=forms.CheckboxSelectMultiple,
    )

    class Meta:
        model = MiniApp
        fields = ["tags"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["tags"].queryset = MiniAppTag.objects.order_by("name")
