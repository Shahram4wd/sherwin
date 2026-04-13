from django.shortcuts import render

from .models import TimelineEvent


def timeline(request):
    events = TimelineEvent.objects.select_related("linked_post").all()

    # Group by year
    years = {}
    for event in events:
        year = event.event_date.year
        years.setdefault(year, []).append(event)

    # Filter by year
    year_filter = request.GET.get("year")
    if year_filter:
        try:
            year_filter = int(year_filter)
            years = {year_filter: years.get(year_filter, [])}
        except ValueError:
            pass

    # Sort years descending
    sorted_years = dict(sorted(years.items(), reverse=True))
    all_years = sorted(
        TimelineEvent.objects.dates("event_date", "year"), reverse=True
    )

    context = {
        "timeline_years": sorted_years,
        "all_years": [d.year for d in all_years],
        "current_year": year_filter,
    }
    return render(request, "pages/timeline.html", context)
