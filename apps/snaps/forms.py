from django import forms

from apps.blog.models import Post


class MultipleImageInput(forms.ClearableFileInput):
    allow_multiple_selected = True


class MultipleImageField(forms.ImageField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("widget", MultipleImageInput)
        super().__init__(*args, **kwargs)

    def clean(self, data, initial=None):
        single_clean = super().clean
        if isinstance(data, (list, tuple)):
            if not data:
                if self.required:
                    raise forms.ValidationError(self.error_messages["required"])
                return []
            return [single_clean(d, initial) for d in data]
        return [single_clean(data, initial)]


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
    images = MultipleImageField(
        required=True,
        widget=MultipleImageInput(attrs={"accept": "image/*", "class": "snap-image-input"}),
    )
    tag_list = forms.CharField(required=False, widget=forms.HiddenInput())

    class Meta:
        model = Post
        fields = []  # We handle fields manually

    def clean_caption(self):
        return (self.cleaned_data.get("caption") or "").strip()

    def save(self, commit=True, user=None, extra_images=None):
        post = super().save(commit=False)
        post.post_type = Post.PostType.SNAP
        post.status = Post.Status.PUBLISHED
        post.body = self.cleaned_data.get("caption", "")
        post.featured_image = self.cleaned_data["images"]
        if user:
            post.created_by = user
        if commit:
            post.save()
            # Handle tags
            tag_str = self.cleaned_data.get("tag_list", "")
            if tag_str:
                tags = [t.strip() for t in tag_str.split(",") if t.strip()]
                post.tags.set(tags, clear=True)
            else:
                post.tags.clear()
            # Handle extra images
            if extra_images:
                from apps.blog.models import PostMedia
                for i, img in enumerate(extra_images):
                    PostMedia.objects.create(
                        post=post,
                        file=img,
                        media_type=PostMedia.MediaType.IMAGE,
                        order=i + 1,
                        is_gallery_visible=True,
                    )
        return post
