# PRD: Header Navigation Visibility

## Overview

Verify that the TalkTravel staging site displays the correct navigation items in the header bar.

## Objective

Ensure all required nav links and CTAs are present and visible to users when they land on the homepage, providing clear pathways to key sections of the site.

## Scope

**URL**: https://staging.talktravel.com  
**Area**: Global site header / navigation bar

## Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `https://staging.talktravel.com` | Page loads successfully |
| 2 | Inspect the header/nav bar | Header is visible |
| 3 | Check for **Community** link | "Community" nav link is visible |
| 4 | Check for **Blog** link | "Blog" nav link is visible |
| 5 | Check for **FAQ** link | "FAQ" nav link is visible |
| 6 | Check for **Login** link | "Login" link is visible |
| 7 | Check for **Join Free** button | "Join Free" CTA button is visible |

## Acceptance Criteria

- [ ] The header renders on page load at `staging.talktravel.com`
- [ ] **Community** link is visible in the nav bar
- [ ] **Blog** link is visible in the nav bar
- [ ] **FAQ** link is visible in the nav bar
- [ ] **Login** link is visible in the nav bar
- [ ] **Join Free** button is visible in the nav bar

## Out of Scope

- Clicking through to the linked pages (covered by separate flows)
- Mobile/responsive header behaviour
- Header appearance when a user is logged in
