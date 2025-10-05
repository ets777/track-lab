import { Component, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ITag } from 'src/app/db/models/tag';

@Component({
  selector: 'app-tags',
  templateUrl: './tags.component.html',
  styleUrls: ['./tags.component.scss'],
  imports: [RouterLink],
})
export class TagsComponent  implements OnInit {
  @Input() tags: ITag[] = [];

  constructor() { }

  ngOnInit() {}

}
