from django import forms

from apps.blog.models import Post


class SnapForm(forms.ModelForm):
    """Kid-friendly form for creating Snaps."""

    caption = forms.CharField(
        max_length=500,
        required=False,
        widget=forms.Textarea(
            attrs={
                "placeholder": "What did you make / discover / do?",
                "rows": 3,
                "class": "snap-caption",
                "maxlength": "500",
            }
        ),
    )
    image = forms.ImageField(
        required=True,
        widget=forms.FileInput(attrs={"accept": "image/*", "class": "snap-image-input"}),
    )
    tag_list = forms.CharField(required=False, widget=forms.HiddenInput())

    class Meta:
        model = Post
        fields = []  # We handle fields manually

    def clean_caption(self):
        return (self.cleaned_data.get("caption") or "").strip()

    def save(self, commit=True, user=None):
        post = super().save(commit=False)
        post.post_type = Post.PostType.SNAP
        post.status = Post.Status.PUBLISHED
        post.body = self.cleaned_data.get("caption", "")
        post.featured_image = self.cleaned_data["image"]
        if user:
            post.created_by = user
        if commit:
            post.save()
            # Handle tags
            tag_str = self.cleaned_data.get("tag_list", "")
            if tag_str:
                tags = [t.strip() for t in tag_str.split(",") if t.strip()]
                post.tags.set(*tags, clear=True)
            else:
                post.tags.clear()
        return post
