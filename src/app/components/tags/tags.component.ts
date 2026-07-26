import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonChip } from '@ionic/angular/standalone';
import { ITag } from 'src/app/db/models/tag';

@Component({
  selector: 'app-tags',
  templateUrl: './tags.component.html',
  styleUrls: ['./tags.component.scss'],
  imports: [RouterLink, IonChip],
})
export class TagsComponent {
  @Input() tags: ITag[] = [];
}
